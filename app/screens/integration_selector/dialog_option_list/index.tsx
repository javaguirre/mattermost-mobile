// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback, useEffect} from 'react';
import {
    Platform, FlatList, View,
} from 'react-native';

import FormattedText from '@app/components/formatted_text';
import {useTheme} from '@app/context/theme';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

import OptionListRow from '../option_list_row';

const INITIAL_BATCH_TO_RENDER = 15;

type Props = {
    data: DialogOption[];
    selectable?: boolean;
    term: string;
    handleSelectOption: (item: DialogOption) => void;
    selectedIds: {[id: string]: DialogOption};
}

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

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        list: {
            backgroundColor: theme.centerChannelBg,
            flex: 1,
            ...Platform.select({
                android: {
                    marginBottom: 20,
                },
            }),
        },
        container: {
            flexGrow: 1,
        },
        separator: {
            height: 1,
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
        },
        listView: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
            ...Platform.select({
                android: {
                    marginBottom: 20,
                },
            }),
        },
        loadingText: {
            color: changeOpacity(theme.centerChannelColor, 0.6),
        },
        searching: {
            backgroundColor: theme.centerChannelBg,
            height: '100%',
            position: 'absolute',
            width: '100%',
        },
        sectionContainer: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.07),
            paddingLeft: 10,
            paddingVertical: 2,
        },
        sectionWrapper: {
            backgroundColor: theme.centerChannelBg,
        },
        sectionText: {
            fontWeight: '600',
            color: theme.centerChannelColor,
        },
        noResultContainer: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
        },
        noResultText: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            ...typography('Body', 600, 'Regular'),
        },
    };
});

function DialogOptionList({
    term, handleSelectOption, selectable = false, selectedIds, data,
}: Props) {
    const theme = useTheme();

    // Renders
    // const renderEmptyList = useCallback(() => {
    //     return noResults || null;
    // }, [noResults]);

    // const renderLoading = useCallback(() => {
    //     if (!loading) {
    //         return null;
    //     }

    //     const text = {
    //         id: t('mobile.integration_selector.loading_options'),
    //         defaultMessage: 'Loading Options...',
    //     };

    //     return (
    //         <View style={style.loadingContainer}>
    //             <FormattedText
    //                 {...text}
    //                 style={style.loadingText}
    //             />
    //         </View>
    //     );
    // }, [style, dataSource, loading, intl]);

    const renderOptionItem = useCallback((itemProps: any) => {
        const itemSelected = Boolean(selectedIds[itemProps.item.value]);
        return (
            <OptionListRow
                id={itemProps.id}
                theme={theme}
                item={itemProps.item}
                key={itemProps.id}
                onPress={handleSelectOption}
                selectable={selectable}
                selected={itemSelected}
            />
        );
    }, [selectedIds, selectable]);

    // const searchDynamicOptions = useCallback(async (searchTerm = '') => {
    //     if (options && options !== integrationData && !searchTerm) {
    //         setIntegrationData(options);
    //     }

    //     if (!getDynamicOptions) {
    //         return;
    //     }

    //     const results: DialogOption[] = await getDynamicOptions(searchTerm.toLowerCase());
    //     const searchData = results || [];

    //     if (searchTerm) {
    //         setSearchResults(searchData);
    //     } else {
    //         setIntegrationData(searchData);
    //     }
    // }, [options, getDynamicOptions, integrationData]);

    // useEffect(() => {
    //     const multiselectItems: MultiselectSelectedMap = {};

    //     if (isMultiselect && Array.isArray(selected) && !([ViewConstants.DATA_SOURCE_USERS, ViewConstants.DATA_SOURCE_CHANNELS].includes(dataSource))) {
    //         for (const value of selected) {
    //             const option = options?.find((opt) => opt.value === value);
    //             if (option) {
    //                 multiselectItems[value] = option;
    //             }
    //         }

    //         setMultiselectSelected(multiselectItems);
    //     }
    // }, []);

    // useEffect(() => {
    //     setLoading(true);

    //     if (dataSource === ViewConstants.DATA_SOURCE_DYNAMIC) {
    //         await searchDynamicOptions(text);
    //     }

    //     setLoading(false);
    // }, [term]);

    // useEffect(() => {
    //     let listData: DialogOption[] = data;

    //     if (term) {
    //         listData = searchResults;
    //     }

    //     if (dataSource === ViewConstants.DATA_SOURCE_DYNAMIC) {
    //         listData = (integrationData as DialogOption[]).filter((option) => option.text && option.text.toLowerCase().includes(term));
    //     }

    //     setIntegrationData(listData);
    // }, [searchResults]);

    // useEffect(() => {
    //     // Static and dynamic option search
    //     searchDynamicOptions('');

    //     return () => {
    //         if (searchTimeoutId.current) {
    //             clearTimeout(searchTimeoutId.current);
    //             searchTimeoutId.current = null;
    //         }
    //     };
    // }, []);

    return (
        <FlatList
            data={data}
            keyboardShouldPersistTaps='always'
            initialNumToRender={INITIAL_BATCH_TO_RENDER}

            // ListEmptyComponent={renderEmptyList()}
            maxToRenderPerBatch={INITIAL_BATCH_TO_RENDER + 1}
            removeClippedSubviews={true}
            renderItem={renderOptionItem}
            scrollEventThrottle={60}
        />
    );
}

export default DialogOptionList;
