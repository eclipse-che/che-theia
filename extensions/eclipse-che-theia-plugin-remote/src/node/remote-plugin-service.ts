/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { injectable, inject } from 'inversify';
import { RemotePluginStarterService } from '../common/remote-plugin-protocol';
import { HostedPluginRemote } from './hosted-plugin-remote';

@injectable()
export class RemotePluginServiceImpl implements RemotePluginStarterService {

    @inject(HostedPluginRemote)
    protected readonly hostedPluginRemote: HostedPluginRemote;

    loadRemotePlugins(): Promise<void> {
        this.hostedPluginRemote.startRemotePlugins();
        return Promise.resolve();
    }

}
