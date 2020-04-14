/*********************************************************************
 * Copyright (c) 2018-2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { PluginRemoteInit } from './plugin-remote-init';

/**
 * Entry point of a Remote Endpoint. It is executed as a new separate nodejs process.
 * It is using inversify to bind all the stuff.
 * @author Florent Benoit
 */

process.on('SIGINT', () => {
    process.exit();
});

process.on('uncaughtException', (err: Error) => {
    console.error('Remote plugin node: got an uncaught exception', err);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const unhandledPromises: Promise<any>[] = [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    unhandledPromises.push(promise);
    setTimeout(() => {
        const index = unhandledPromises.indexOf(promise);
        if (index >= 0) {
            promise.catch(err => {
                unhandledPromises.splice(index, 1);
                const containerName = process.env['CHE_MACHINE_NAME'];
                console.error(`Remote plugin in ${containerName}: promise rejection is not handled in two seconds: ${err}`);
                if (err.stack) {
                    console.error(`Remote plugin in ${containerName}: promise rejection stack trace: ${err.stack}`);
                }
            });
        }
    }, 2000);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
process.on('rejectionHandled', (promise: Promise<any>) => {
    const index = unhandledPromises.indexOf(promise);
    if (index >= 0) {
        unhandledPromises.splice(index, 1);
    }
});

// configured port number
const pluginPort = parseInt(process.env.THEIA_PLUGIN_ENDPOINT_PORT || '2503', 10);

// start endpoint
const pluginRemoteInit = new PluginRemoteInit(pluginPort);
pluginRemoteInit.init().catch(error => {
    console.error('Error while starting endpoint: ', error);
});
