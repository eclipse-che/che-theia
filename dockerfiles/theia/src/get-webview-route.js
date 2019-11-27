/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

const fs = require('fs');
const workspaceClient = require('@eclipse-che/workspace-client');

// Assume that self-signed certificate is located by the following path
const SS_CRT_PATH = '/tmp/che/secret/ca.crt';

// Configure workspace API client
const restAPIConfig = {
    baseUrl: process.env.CHE_API
};

const token = process.env.CHE_MACHINE_TOKEN;
if (token) {
    restAPIConfig.headers = {};
    restAPIConfig.headers['Authorization'] = 'Bearer ' + token;
}

if (fs.existsSync(SS_CRT_PATH)) {
    restAPIConfig.ssCrtPath = SS_CRT_PATH;
}

// Create rest API workspace client
const restApiClient = workspaceClient.default.getRestApi(restAPIConfig);

// Search for IDE route
function getIdeRoute() {
    return new Promise((resolve, reject) => {
        restApiClient.getById(process.env.CHE_WORKSPACE_ID).then(workspace => {
            const containers = workspace.runtime.machines;
            Object.keys(containers).forEach(containerName => {
                const container = containers[containerName];
                const servers = container['servers'];
                if (servers) {
                    const ideServerName = Object.keys(servers).find(serverName => servers[serverName].attributes && servers[serverName].attributes['type'] === 'ide');
                    if (ideServerName) {
                        resolve(servers[ideServerName].url);
                    }
                }
            });
            reject('Server with type "ide" not found.');
        }).catch(error => {
            reject(error);
        });
    });
}

getIdeRoute().then(ideRoute => {
    if (!ideRoute) {
        throw new Error('Failed to get ide route.');
    }

    // Remove trailing slash if any
    if (ideRoute.endsWith('/')) {
        ideRoute = ideRoute.substring(0, ideRoute.length - 1);
    }
    // Remove protocol
    const webviewDomain = ideRoute.replace(/^https?:\/\//, '');
    // Return result to shell by writing into stdout
    process.stdout.write(webviewDomain);
}).catch(error => {
    console.error('Unable to get IDE route. Webviews might not work. Cause:', error);
    // Just exit this script without returning a value to the shell.
});
