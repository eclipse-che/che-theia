/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { injectable } from 'inversify';
import { ExtPluginApiProvider, ExtPluginApi } from '@theia/plugin-ext';
import * as path from 'path';

@injectable()
export class TestServerPluginApiProvider implements ExtPluginApiProvider {

    provideApi(): ExtPluginApi {
        return {
            frontendExtApi: {
                initPath: './browser/testservice-api-frontend-provider.js',
                initFunction: 'initializeApi',
                initVariable: 'testserver_api_provider'
            },
            backendInitPath: path.join(__dirname, './node/testservice-api-node-provider.js')
        };
    }
}
