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

type Props = {
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
        <View style={style.container}>
            <TouchableOpacity
                style={style.container}
                onPress={onPressRow}
            >
                <Text>{text}</Text>

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
            </TouchableOpacity>
        </View>
    );
};

export default OptionListRow;
