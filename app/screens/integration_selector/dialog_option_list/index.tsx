// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback} from 'react';
import {
    Platform, FlatList, RefreshControl, View,
} from 'react-native';

import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

const INITIAL_BATCH_TO_RENDER = 15;

type Props = {
    data: DialogOption[];
    selectable?: boolean;
    term: string;
    handleSelectOption: (item: DialogOption) => void;
}

const keyExtractor = (item: any): string => {
    return item.id || item.key || item.value || item;
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
    term, handleSelectOption, selectable, data,
}: Props) {
    const style = getStyleFromTheme(theme);

    // Renders
    const renderEmptyList = useCallback(() => {
        return noResults || null;
    }, [noResults]);

    const renderSeparator = useCallback(() => {
        if (!shouldRenderSeparator) {
            return null;
        }

        return (
            <View style={style.separator}/>
        );
    }, [shouldRenderSeparator, style]);

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

    // const renderListItem = useCallback(({item}: any) => {
    //     const props: ListItemProps = {
    //         id: item.key,
    //         item,
    //         selected: item.selected,
    //         selectable,
    //         enabled: true,
    //         onPress: onRowPress,
    //     };

    //     if ('disableSelect' in item) {
    //         props.enabled = !item.disableSelect;
    //     }

    //     return renderItem(props);
    // }, [onRowPress, selectable, renderItem]);

    const renderFooter = useCallback((): React.ReactElement<any, string> | null => {
        if (!loading || !loadingComponent) {
            return null;
        }
        return loadingComponent;
    }, [loading, loadingComponent]);

    let refreshControl;
    if (canRefresh) {
        refreshControl = (
            <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
            />);
    }

    return (
        <FlatList
            contentContainerStyle={style.container}
            data={data}
            keyboardShouldPersistTaps='always'
            keyExtractor={keyExtractor}
            initialNumToRender={INITIAL_BATCH_TO_RENDER}
            ItemSeparatorComponent={renderSeparator}
            ListEmptyComponent={renderEmptyList()}
            ListFooterComponent={renderFooter}
            maxToRenderPerBatch={INITIAL_BATCH_TO_RENDER + 1}
            refreshControl={refreshControl}
            removeClippedSubviews={true}
            renderItem={renderListItem}
            scrollEventThrottle={60}
            style={style.list}
            testID={testID}
        />
    );
}

export default DialogOptionList;
