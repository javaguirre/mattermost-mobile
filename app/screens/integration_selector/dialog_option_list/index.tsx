// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback, useEffect, useState} from 'react';
import {Platform, FlatList, View} from 'react-native';

import FormattedText from '@app/components/formatted_text';
import {useTheme} from '@app/context/theme';
import {t} from '@app/i18n';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

import OptionListRow, {Props as OptionListRowProps} from '../option_list_row';

const INITIAL_BATCH_TO_RENDER = 15;

type Props = {
    data?: DialogOption[];
    getDynamicOptions?: (userInput?: string) => Promise<DialogOption[]>;
    selectable?: boolean;
    term: string;
    handleSelectOption: (item: DialogOption) => void;
    selectedIds: {[id: string]: DialogOption};
    testID: string;
}

const filterSearchData = (searchData: DialogOption[], searchTerm: string) => {
    if (!searchData) {
        return [];
    }

    const lowerCasedTerm = searchTerm.toLowerCase();
    const results = searchData.filter((option) => option.text && option.text.includes(lowerCasedTerm));
    return results;
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
    term, handleSelectOption, selectable = false,
    selectedIds, data = [], getDynamicOptions, testID,
}: Props) {
    const theme = useTheme();
    const style = getStyleFromTheme(theme);

    const [optionData, setOptionData] = useState<DialogOption[]>(data);
    const [loading, setLoading] = useState(false);

    const updateOptionData = async () => {
        if (getDynamicOptions) {
            setOptionData(await getDynamicOptions(term));
        } else {
            setOptionData(filterSearchData(data, term));
        }
    };

    const renderFooter = (): React.ReactElement<string> | null => {
        const text = {
            id: t('mobile.integration_selector.loading_options'),
            defaultMessage: 'Loading Options...',
        };

        if (!loading) {
            return null;
        }

        return (
            <View style={style.loadingContainer}>
                <FormattedText
                    {...text}
                    style={style.loadingText}
                />
            </View>
        );
    };

    const renderOptionItem = useCallback((itemProps: OptionListRowProps) => {
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

    useEffect(() => {
        setLoading(true);
        updateOptionData();
        setLoading(false);
    }, [term]);

    const renderEmptyList = useCallback((): JSX.Element | null => {
        if (loading) {
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

    return (
        <FlatList
            contentContainerStyle={style.container}
            data={optionData}
            keyboardShouldPersistTaps='always'
            initialNumToRender={INITIAL_BATCH_TO_RENDER}
            ListEmptyComponent={renderEmptyList()}
            ListFooterComponent={renderFooter()}
            maxToRenderPerBatch={INITIAL_BATCH_TO_RENDER + 1}
            removeClippedSubviews={true}
            renderItem={renderOptionItem}
            scrollEventThrottle={60}
            style={style.list}
            testID={testID}
        />
    );
}

export default DialogOptionList;
