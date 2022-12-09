// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import CompassIcon from '@app/components/compass_icon';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

export type Props = {
    id: string;
    theme: object;
    item: { text: string; value: string };
    onPress: (item: DialogOption) => void;
    enabled?: boolean;
    selectable?: boolean;
    selected?: boolean;
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flexDirection: 'row',
            height: 65,
            paddingHorizontal: 15,
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg,
        },
        textContainer: {
            marginLeft: 10,
            justifyContent: 'center',
            flexDirection: 'column',
            flex: 1,
        },
        optionText: {
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'Regular'),
        },
        children: {
            flex: 1,
            flexDirection: 'row',
        },
        selector: {
            height: 28,
            width: 28,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: 'rgba(61, 60, 64, 0.32)',
            alignItems: 'center',
            justifyContent: 'center',
        },
        selectorContainer: {
            height: 50,
            paddingRight: 10,
            alignItems: 'center',
            justifyContent: 'center',
        },
        selectorDisabled: {
            borderColor: 'rgba(61, 60, 64, 0.16)',
        },
        selectorFilled: {
            backgroundColor: '#166DE0',
            borderWidth: 0,
        },
    };
});

const OptionListRow = ({
    enabled = true, selectable = false, selected = false, theme, item, onPress, id,
}: Props) => {
    const {text} = item;
    const style = getStyleFromTheme(theme);

    const onPressRow = useCallback((): void => {
        onPress(item);
    }, [onPress, item]);

    return (
        <TouchableOpacity
            style={style.container}
            onPress={onPressRow}
        >
            {selectable &&
                <View style={style.selectorContainer}>
                    <View
                        testID={id}
                        style={[style.selector, (selected && style.selectorFilled), (!enabled &&
 style.selectorDisabled)]}
                    >
                        {selected &&
                            <CompassIcon
                                name='check'
                                size={24}
                                color='#fff'
                            />
                        }
                    </View>
                </View>
            }

            <View
                testID={id}
                style={style.children}
            >
                <View style={style.textContainer}>
                    <Text style={style.optionText}>{text}</Text>
                </View>
            </View>

        </TouchableOpacity>
    );
};

export default OptionListRow;
