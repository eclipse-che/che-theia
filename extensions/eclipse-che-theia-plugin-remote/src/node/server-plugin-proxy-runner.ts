/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import {
  HostedPluginClient,
  PLUGIN_HOST_BACKEND,
  ServerPluginRunner,
} from '@theia/plugin-ext/lib/common/plugin-protocol';
import { inject, injectable } from 'inversify';

import { DeployedPlugin } from '@theia/plugin-ext';
import { HostedPluginRemote } from './hosted-plugin-remote';

/**
 * Proxy runner being a facade for loading plugins locally or remotely
 */
@injectable()
export class ServerPluginProxyRunner implements ServerPluginRunner {
  @inject(HostedPluginRemote)
  protected readonly hostedPluginRemote: HostedPluginRemote;

  private defaultRunner: ServerPluginRunner;

  public setDefault(defaultRunner: ServerPluginRunner): void {
    this.defaultRunner = defaultRunner;
  }

  public setClient(client: HostedPluginClient): void {
    this.hostedPluginRemote.setClient(client);
  }

  public clientClosed(): void {
    this.hostedPluginRemote.clientClosed();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public acceptMessage(pluginHostId: string, jsonMessage: string): boolean {
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public onMessage(pluginHostId: string, jsonMessage: string): void {
    // do routing on the message
    if (pluginHostId !== PLUGIN_HOST_BACKEND) {
      this.hostedPluginRemote.onMessage(pluginHostId, jsonMessage);
    } else {
      this.defaultRunner.onMessage(pluginHostId, jsonMessage);
    }
  }

  /**
   * Provides additional deployed plugins.
   */
  public getExtraDeployedPlugins(): Promise<DeployedPlugin[]> {
    return this.hostedPluginRemote.getExtraDeployedPlugins();
  }

  /**
   * Provides additional plugin ids.
   */
  public getExtraDeployedPluginIds(): Promise<string[]> {
    return this.hostedPluginRemote.getExtraDeployedPluginIds();
  }
}
