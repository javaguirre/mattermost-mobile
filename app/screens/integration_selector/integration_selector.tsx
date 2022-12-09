// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import ServerChannelList from '@app/components/server_channel_list';
import ServerUserList from '@app/components/server_user_list';
import SearchBar from '@components/search';
import {View as ViewConstants} from '@constants';
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
    dataSource: string;
    handleSelect: (opt: Selection) => void;
    isMultiselect?: boolean;
    selected: SelectedDialogValue;
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
    {dataSource, isMultiselect = false, selected, handleSelect,
        currentTeamId, currentUserId, componentId, getDynamicOptions, options, teammateNameDisplay}: Props) {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const intl = useIntl();

    // HOOKS
    const [term, setTerm] = useState<string>('');
    const [selectedIds, setSelectedIds] = useState<{[id: string]: DataType}>({});

    // Callbacks
    const clearSearch = useCallback(() => {
        setTerm('');
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
        setSelectedIds((current) => {
            const selectedIdItems = {...current};
            delete selectedIdItems[itemKey];
            return selectedIdItems;
        });
    }, [dataSource]);

    const handleSelectDataType = useCallback((item: UserProfile | Channel | DialogOption): void => {
        if (!isMultiselect) {
            handleSelect(item);
            close();
        }

        setSelectedIds((current) => handleIdSelection(dataSource, current, item));
    }, [isMultiselect, handleIdSelection, handleSelect, close, dataSource]);

    const onHandleMultiselectSubmit = useCallback(() => {
        handleSelect(Object.values(selectedIds) as (UserProfile[] | Channel[]));
        close();
    }, [selectedIds, handleSelect]);

    const onSearch = useCallback((text: string) => {
        if (!text) {
            clearSearch();
            return;
        }

        setTerm(text);
    }, [dataSource]);

    // Effects
    useNavButtonPressed(SUBMIT_BUTTON_ID, componentId, onHandleMultiselectSubmit, [onHandleMultiselectSubmit]);

    useEffect(() => {
        if (!isMultiselect) {
            return;
        }

        setButtons(componentId, {
            rightButtons: [rightButton],
        });
    }, [rightButton, componentId, isMultiselect]);

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
    }, [selectedIds, style, theme]);

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
                        data={options}
                        getDynamicOptions={getDynamicOptions}
                        handleSelectOption={handleSelectDataType}
                        selectable={isMultiselect}
                        selectedIds={selectedIds as {[id: string]: DialogOption}}
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
