/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

export const remotePluginServicePath = '/services/remotePlugin';

export const RemotePluginInitializerService = Symbol('RemotePluginInitializer');
export interface RemotePluginInitializerService {
    loadRemotePlugins(): Promise<void>
}
