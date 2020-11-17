/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

const exported = require('../../src/cdn/webpack-loader');

import { CheCdnSupport } from '../../src/cdn/base';

describe('Test webpack-loader', () => {
    test('test CheCdnSupport.webpackLoader function is exported', async () => {
        expect(exported).toBe(CheCdnSupport.webpackLoader);
    });
});
