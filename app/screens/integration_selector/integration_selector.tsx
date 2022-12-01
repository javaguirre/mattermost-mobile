// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import ServerChannelList from '@app/components/server_channel_list';
import ServerUserList from '@app/components/server_user_list';
import {t} from '@app/i18n';
import FormattedText from '@components/formatted_text';
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

import CustomList from './custom_list';
import OptionListRow from './option_list_row';
import SelectedOptions from './selected_options';

type DataType = DialogOption | Channel | UserProfile;
type DataTypeList = DialogOption[] | Channel[] | UserProfile[];
type Selection = DataType | DataTypeList;
type MultiselectSelectedMap = Dictionary<DialogOption> | Dictionary<Channel> | Dictionary<UserProfile>;

const SUBMIT_BUTTON_ID = 'submit-integration-selector-multiselect';

const close = () => {
    popTopScreen();
};

const extractItemKey = (dataSource: string, item: DataType): string => {
    switch (dataSource) {
        case ViewConstants.DATA_SOURCE_USERS: {
            const typedItem = item as UserProfile;
            return typedItem.id;
        }
        case ViewConstants.DATA_SOURCE_CHANNELS: {
            const typedItem = item as Channel;
            return typedItem.id;
        }
        default: {
            const typedItem = item as DialogOption;
            return typedItem.value;
        }
    }
};

const toggleFromMap = <T extends DialogOption | Channel | UserProfile>(current: MultiselectSelectedMap, key: string, item: T): MultiselectSelectedMap => {
    const newMap = {...current};

    if (current[key]) {
        delete newMap[key];
    } else {
        newMap[key] = item;
    }

    return newMap;
};

const filterSearchData = (source: string, searchData: DataTypeList, searchTerm: string) => {
    if (!searchData) {
        return [];
    }

    const lowerCasedTerm = searchTerm.toLowerCase();

    if (source === ViewConstants.DATA_SOURCE_DYNAMIC) {
        return searchData;
    }

    return (searchData as DialogOption[]).filter((option) => option.text && option.text.includes(lowerCasedTerm));
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

    // Channels and DialogOptions, will be removed
    const [multiselectSelected, setMultiselectSelected] = useState<MultiselectSelectedMap>({});

    // Users selection and in the future Channels and DialogOptions
    const [selectedIds, setSelectedIds] = useState<{[id: string]: DataType}>({});
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

    const handleSelectItem = useCallback((item: DialogOption) => {
        if (!isMultiselect) {
            handleSelect(item);
            close();
            return;
        }

        const itemKey = extractItemKey(dataSource, item);
        setMultiselectSelected((current) => toggleFromMap(current, itemKey, item as DialogOption));
    }, [isMultiselect, dataSource, handleSelect]);

    const handleRemoveOption = useCallback((item: DialogOption) => {
        const itemKey = extractItemKey(dataSource, item);
        setMultiselectSelected((current) => {
            const multiselectSelectedItems = {...current};
            delete multiselectSelectedItems[itemKey];
            return multiselectSelectedItems;
        });
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

    const handleSelectProfile = useCallback((user: UserProfile): void => {
        if (!isMultiselect) {
            handleSelect(user);
            close();
        }

        setSelectedIds((current) => handleIdSelection(dataSource, current, user));
    }, [isMultiselect, handleIdSelection, handleSelect, close, dataSource]);

    const handleSelectChannel = useCallback((channel: Channel): void => {
        if (!isMultiselect) {
            handleSelect(channel);
            close();
        }

        setSelectedIds((current) => handleIdSelection(dataSource, current, channel));
    }, [isMultiselect, handleIdSelection, handleSelect, close, dataSource]);

    const onHandleMultiselectSubmit = useCallback(() => {
        if (dataSource === ViewConstants.DATA_SOURCE_USERS) {
            // New multiselect
            handleSelect(Object.values(selectedIds) as UserProfile[]);
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
                setSearchResults(filterSearchData('', integrationData, text));
                return;
            }

            setLoading(true);

            if (dataSource === ViewConstants.DATA_SOURCE_DYNAMIC) {
                await searchDynamicOptions(text);
            }

            setLoading(false);
        }, General.SEARCH_TIMEOUT_MILLISECONDS);
    }, [dataSource, integrationData, currentTeamId]);

    // Effects
    useNavButtonPressed(SUBMIT_BUTTON_ID, componentId, onHandleMultiselectSubmit, [onHandleMultiselectSubmit]);

    useEffect(() => {
        return () => {
            if (searchTimeoutId.current) {
                clearTimeout(searchTimeoutId.current);
                searchTimeoutId.current = null;
            }
        };
    }, []);

    useEffect(() => {
        // Static and dynamic option search
        searchDynamicOptions('');
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
    const renderLoading = useCallback(() => {
        if (!loading) {
            return null;
        }

        const text = {
            id: t('mobile.integration_selector.loading_options'),
            defaultMessage: 'Loading Options...',
        };

        return (
            <View style={style.loadingContainer}>
                <FormattedText
                    {...text}
                    style={style.loadingText}
                />
            </View>
        );
    }, [style, dataSource, loading, intl]);

    const renderNoResults = useCallback((): JSX.Element | null => {
        if (loading || page.current === -1) {
            return null;
        }

        return (
            <View style={style.noResultContainer}>
                <FormattedText
                    id='mobile.custom_list.no_results'
                    defaultMessage='No Results'
                    style={style.noResultText}
                />
            </View>
        );
    }, [loading, style]);

    const renderOptionItem = useCallback((itemProps: any) => {
        const itemSelected = Boolean(multiselectSelected[itemProps.item.value]);
        return (
            <OptionListRow
                key={itemProps.id}
                {...itemProps}
                theme={theme}
                selectable={isMultiselect}
                selected={itemSelected}
            />
        );
    }, [multiselectSelected, theme, isMultiselect]);

    const renderSelectedOptions = useCallback((): React.ReactElement<string> | null => {
        let selectedItems: Channel[] | DialogOption[] | UserProfile[] = Object.values(multiselectSelected);

        if ([ViewConstants.DATA_SOURCE_USERS, ViewConstants.DATA_SOURCE_CHANNELS].includes(dataSource)) {
            // New multiselect
            selectedItems = Object.values(selectedIds) as UserProfile[];
        }

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
                        handleSelectProfile={handleSelectProfile}
                    />
                );
            case ViewConstants.DATA_SOURCE_CHANNELS:
                return (
                    <ServerChannelList
                        currentTeamId={currentTeamId}
                        term={term}
                        handleSelectChannel={handleSelectChannel}
                    />

                );
            default:
                return (
                    <CustomList
                        data={customListData as DialogOption[]}
                        key='custom_list'
                        loading={loading}
                        loadingComponent={renderLoading()}
                        noResults={renderNoResults}
                        onRowPress={handleSelectItem}
                        renderItem={renderOptionItem}
                        theme={theme}
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
