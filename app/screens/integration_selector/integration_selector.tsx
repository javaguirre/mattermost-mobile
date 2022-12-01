// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import ServerChannelList from '@app/components/server_channel_list';
import ServerUserList from '@app/components/server_user_list';
import SearchBar from '@components/search';
import {General, View as ViewConstants} from '@constants';
import {useTheme} from '@context/theme';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {
    buildNavigationButton,
    popTopScreen, setButtons,
} from '@screens/navigation';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import DialogOptionList from './dialog_option_list';
import SelectedOptions from './selected_options';

type DataType = DialogOption | Channel | UserProfile;
type DataTypeList = DialogOption[] | Channel[] | UserProfile[];
type Selection = DataType | DataTypeList;
type MultiselectSelectedMap = Dictionary<DialogOption> | Dictionary<Channel> | Dictionary<UserProfile>;

const SUBMIT_BUTTON_ID = 'submit-integration-selector-multiselect';

const close = () => {
    popTopScreen();
};

const filterSearchData = (source: string, searchData: DialogOption[], searchTerm: string) => {
    if (!searchData) {
        return [];
    }

    const lowerCasedTerm = searchTerm.toLowerCase();

    if (source === ViewConstants.DATA_SOURCE_DYNAMIC) {
        return searchData;
    }

    return searchData.filter((option) => option.text && option.text.includes(lowerCasedTerm));
};

const handleIdSelection = (dataSource: string, currentIds: {[id: string]: DataType}, item: DataType) => {
    const newSelectedIds = {...currentIds};
    const key = extractItemKey(dataSource, item);
    const wasSelected = currentIds[key];

    if (wasSelected) {
        Reflect.deleteProperty(newSelectedIds, key);
    } else {
        newSelectedIds[key] = item;
    }

    return newSelectedIds;
};

export type Props = {
    getDynamicOptions?: (userInput?: string) => Promise<DialogOption[]>;
    options?: PostActionOption[];
    currentTeamId: string;
    currentUserId: string;
    data?: DataTypeList;
    dataSource: string;
    handleSelect: (opt: Selection) => void;
    isMultiselect?: boolean;
    selected: SelectedDialogValue;
    theme: Theme;
    teammateNameDisplay: string;
    componentId: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
        },
        searchBar: {
            marginVertical: 5,
            height: 38,
        },
        loadingContainer: {
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg,
            height: 70,
            justifyContent: 'center',
        },
        loadingText: {
            color: changeOpacity(theme.centerChannelColor, 0.6),
        },
        noResultContainer: {
            flexGrow: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
        },
        noResultText: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            ...typography('Body', 600, 'Regular'),
        },
        searchBarInput: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'Regular'),
        },
        separator: {
            height: 1,
            flex: 0,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
        },
    };
});

function IntegrationSelector(
    {dataSource, data, isMultiselect = false, selected, handleSelect,
        currentTeamId, currentUserId, componentId, getDynamicOptions, options, teammateNameDisplay}: Props) {
    const theme = useTheme();
    const searchTimeoutId = useRef<NodeJS.Timeout | null>(null);
    const style = getStyleSheet(theme);
    const intl = useIntl();

    // HOOKS
    const [integrationData, setIntegrationData] = useState<DataTypeList>(data || []);
    const [loading, setLoading] = useState<boolean>(false);
    const [term, setTerm] = useState<string>('');
    const [searchResults, setSearchResults] = useState<DataTypeList>([]);

    // DialogOptions, will be removed
    const [multiselectSelected, setMultiselectSelected] = useState<MultiselectSelectedMap>({});

    // Users, Channels selection
    const [selectedIds, setSelectedIds] = useState<{[id: string]: DataType}>({});

    // Deprecated
    const [customListData, setCustomListData] = useState<DataTypeList>([]);

    const page = useRef<number>(-1);

    // Callbacks
    const clearSearch = useCallback(() => {
        setTerm('');
        setSearchResults([]);
    }, []);

    // This is the button to submit multiselect options
    const rightButton = useMemo(() => {
        const base = buildNavigationButton(
            SUBMIT_BUTTON_ID,
            'integration_selector.multiselect.submit.button',
            undefined,
            intl.formatMessage({id: 'integration_selector.multiselect.submit', defaultMessage: 'Done'}),
        );
        base.enabled = true;
        base.showAsAction = 'always';
        base.color = theme.sidebarHeaderTextColor;
        return base;
    }, [theme.sidebarHeaderTextColor, intl]);

    const handleRemoveOption = useCallback((item: Channel | DialogOption | UserProfile) => {
        const itemKey = extractItemKey(dataSource, item);

        if ([ViewConstants.DATA_SOURCE_USERS, ViewConstants.DATA_SOURCE_CHANNELS].includes(dataSource)) {
            setSelectedIds((current) => {
                const selectedIdItems = {...current};
                delete selectedIdItems[itemKey];
                return selectedIdItems;
            });
        } else {
            setMultiselectSelected((current) => {
                const multiselectSelectedItems = {...current};
                delete multiselectSelectedItems[itemKey];
                return multiselectSelectedItems;
            });
        }
    }, [dataSource]);

    const searchDynamicOptions = useCallback(async (searchTerm = '') => {
        if (options && options !== integrationData && !searchTerm) {
            setIntegrationData(options);
        }

        if (!getDynamicOptions) {
            return;
        }

        const results: DialogOption[] = await getDynamicOptions(searchTerm.toLowerCase());
        const searchData = results || [];

        if (searchTerm) {
            setSearchResults(searchData);
        } else {
            setIntegrationData(searchData);
        }
    }, [options, getDynamicOptions, integrationData]);

    const handleSelectDataType = useCallback((item: UserProfile | Channel | DialogOption): void => {
        if (!isMultiselect) {
            handleSelect(item);
            close();
        }

        setSelectedIds((current) => handleIdSelection(dataSource, current, item));
    }, [isMultiselect, handleIdSelection, handleSelect, close, dataSource]);

    const onHandleMultiselectSubmit = useCallback(() => {
        if ([ViewConstants.DATA_SOURCE_USERS, ViewConstants.DATA_SOURCE_CHANNELS].includes(dataSource)) {
            // New multiselect
            handleSelect(Object.values(selectedIds) as (UserProfile[] | Channel[]));
        } else {
            // Legacy multiselect
            handleSelect(Object.values(multiselectSelected));
        }
        close();
    }, [multiselectSelected, selectedIds, handleSelect]);

    const onSearch = useCallback((text: string) => {
        if (!text) {
            clearSearch();
            return;
        }

        setTerm(text);

        if (searchTimeoutId.current) {
            clearTimeout(searchTimeoutId.current);
        }

        searchTimeoutId.current = setTimeout(async () => {
            if (!dataSource) {
                setSearchResults(filterSearchData('', integrationData as DialogOption[], text));
                return;
            }

            setLoading(true);

            if (dataSource === ViewConstants.DATA_SOURCE_DYNAMIC) {
                await searchDynamicOptions(text);
            }

            setLoading(false);
        }, General.SEARCH_TIMEOUT_MILLISECONDS);
    }, [dataSource, integrationData]);

    // Effects
    useNavButtonPressed(SUBMIT_BUTTON_ID, componentId, onHandleMultiselectSubmit, [onHandleMultiselectSubmit]);

    useEffect(() => {
        // Static and dynamic option search
        searchDynamicOptions('');

        return () => {
            if (searchTimeoutId.current) {
                clearTimeout(searchTimeoutId.current);
                searchTimeoutId.current = null;
            }
        };
    }, []);

    useEffect(() => {
        let listData: DataTypeList = integrationData;

        if (term) {
            listData = searchResults;
        }

        if (dataSource === ViewConstants.DATA_SOURCE_DYNAMIC) {
            listData = (integrationData as DialogOption[]).filter((option) => option.text && option.text.toLowerCase().includes(term));
        }

        setCustomListData(listData);
    }, [searchResults, integrationData]);

    useEffect(() => {
        if (!isMultiselect) {
            return;
        }

        setButtons(componentId, {
            rightButtons: [rightButton],
        });
    }, [rightButton, componentId, isMultiselect]);

    useEffect(() => {
        const multiselectItems: MultiselectSelectedMap = {};

        if (isMultiselect && Array.isArray(selected) && !([ViewConstants.DATA_SOURCE_USERS, ViewConstants.DATA_SOURCE_CHANNELS].includes(dataSource))) {
            for (const value of selected) {
                const option = options?.find((opt) => opt.value === value);
                if (option) {
                    multiselectItems[value] = option;
                }
            }

            setMultiselectSelected(multiselectItems);
        }
    }, []);

    // Renders
    const renderSelectedOptions = useCallback((): React.ReactElement<string> | null => {
        const selectedItems = Object.values(selectedIds) as (Channel[] | UserProfile[] | DialogOption[]);

        if (!selectedItems.length) {
            return null;
        }

        return (
            <>
                <SelectedOptions
                    theme={theme}
                    selectedOptions={selectedItems}
                    dataSource={dataSource}
                    onRemove={handleRemoveOption}
                />
                <View style={style.separator}/>
            </>
        );
    }, [multiselectSelected, selectedIds, style, theme]);

    const renderDataTypeList = () => {
        switch (dataSource) {
            case ViewConstants.DATA_SOURCE_USERS:
                return (
                    <ServerUserList
                        currentTeamId={currentTeamId}
                        currentUserId={currentUserId}
                        teammateNameDisplay={teammateNameDisplay}
                        term={term}
                        tutorialWatched={true}
                        selectedIds={selectedIds as {[id: string]: UserProfile}}
                        handleSelectProfile={handleSelectDataType}
                        selectable={isMultiselect}
                    />
                );
            case ViewConstants.DATA_SOURCE_CHANNELS:
                return (
                    <ServerChannelList
                        currentTeamId={currentTeamId}
                        term={term}
                        handleSelectChannel={handleSelectDataType}
                        selectable={isMultiselect}
                        selectedIds={selectedIds as {[id: string]: Channel}}
                    />
                );
            default:
                return (
                    <DialogOptionList
                        term={term}
                        data={integrationData as DialogOption[]}
                        handleSelectOption={handleSelectDataType}
                        selectable={isMultiselect}
                    />
                );
        }
    };

    const selectedOptionsComponent = renderSelectedOptions();

    return (
        <SafeAreaView style={style.container}>
            <View
                testID='integration_selector.screen'
                style={style.searchBar}
            >
                <SearchBar
                    testID='selector.search_bar'
                    placeholder={intl.formatMessage({id: 'search_bar.search', defaultMessage: 'Search'})}
                    inputStyle={style.searchBarInput}
                    placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                    onChangeText={onSearch}
                    autoCapitalize='none'
                    keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                    value={term}
                />
            </View>

            {selectedOptionsComponent}

            {renderDataTypeList()}
        </SafeAreaView>
    );
}

export default IntegrationSelector;
