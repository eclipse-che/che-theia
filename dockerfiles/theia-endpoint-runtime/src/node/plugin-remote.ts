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

// configured port number
const pluginPort = parseInt(process.env.THEIA_PLUGIN_ENDPOINT_PORT || '2503', 10);

// start endpoint
const pluginRemoteInit = new PluginRemoteInit(pluginPort);
pluginRemoteInit.init().catch(error => {
    console.error('Error while starting endpoint: ', error);
});
