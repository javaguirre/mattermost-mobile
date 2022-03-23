// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntl} from '@test/intl-test-helper';

import ThreadOverview from './thread_overview';

import type PostModel from '@typings/database/models/servers/post';

describe('ThreadOverview', () => {
    it('should match snapshot when post is not saved and 0 replies', () => {
        const props = {
            isSaved: true,
            repliesCount: 0,
            rootPost: {} as PostModel,
            testID: 'thread-overview',
            style: {},
        };

        const wrapper = renderWithIntl(<ThreadOverview {...props}/>);
        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('should match snapshot when post is saved and has replies', () => {
        const props = {
            isSaved: false,
            repliesCount: 2,
            rootPost: {} as PostModel,
            testID: 'thread-overview',
            style: {},
        };

        const wrapper = renderWithIntl(<ThreadOverview {...props}/>);
        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
