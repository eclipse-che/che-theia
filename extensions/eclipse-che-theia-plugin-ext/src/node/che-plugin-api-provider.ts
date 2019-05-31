/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { ExtPluginApiProvider, ExtPluginApi } from '@theia/plugin-ext/lib/common/plugin-ext-api-contribution';
import { injectable } from 'inversify';
// import * as path from 'path';

export function Text2() {
    console.log('>>>>>>>>>>>>>>>>>>>>>>Here I am!!!!!!!!!!!!1');
}

@injectable()
export class ChePluginApiProvider implements ExtPluginApiProvider {

    provideApi(): ExtPluginApi {
        console.log('provide che plugin api!!!');
        return {
            frontendExtApi: {
                initPath: '/che/api/che-api-worker-provider.js',
                initFunction: 'initializeApi',
                initVariable: 'che_api_provider'
            },
            // backendInitPath: path.join(__dirname, '../plugin/node/che-api-node-provider.js')
            backendInitPath: '@eclipse-che/theia-plugin-ext/lib/plugin/node/che-api-node-provider.js'
        };
    }

}
