/**********************************************************************
 * Copyright (c) 2018-2022 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import {
  ChePluginRegistry,
  ChePluginServiceClient,
  PluginDependencies,
} from '@eclipse-che/theia-remote-api/lib/common/plugin-service';
import { Emitter, Event } from '@theia/core/lib/common';

import { injectable } from 'inversify';

@injectable()
export class ChePluginServiceClientImpl implements ChePluginServiceClient {
  /********************************************************************************
   * Changing cache size
   ********************************************************************************/

  protected readonly pluginCacheSizeChangedEvent = new Emitter<number>();

  get onPluginCacheSizeChanged(): Event<number> {
    return this.pluginCacheSizeChangedEvent.event;
  }

  /**
   * Called by Plugins Service when cache of the plugins has been changed.
   */
  async notifyPluginCacheSizeChanged(plugins: number): Promise<void> {
    this.pluginCacheSizeChangedEvent.fire(plugins);
  }

  /********************************************************************************
   * Plugin cached
   ********************************************************************************/

  protected readonly pluginCachedEvent = new Emitter<number>();
  protected readonly onInvalidRegistryFoundEmitter = new Emitter<ChePluginRegistry>();
  readonly onInvalidRegistryFound = this.onInvalidRegistryFoundEmitter.event;

  get onPluginCached(): Event<number> {
    return this.pluginCachedEvent.event;
  }

  /**
   * Called by Plugin Service when new plugin has been added to the cache.
   */
  async notifyPluginCached(plugins: number): Promise<void> {
    this.pluginCachedEvent.fire(plugins);
  }

  /********************************************************************************
   * Caching of plugins is done
   ********************************************************************************/

  protected readonly cachingCompleteEvent = new Emitter<void>();

  get onCachingComplete(): Event<void> {
    return this.cachingCompleteEvent.event;
  }

  /**
   * Called by Plugin Service when caching of the plugins has been finished.
   */
  async notifyCachingComplete(): Promise<void> {
    this.cachingCompleteEvent.fire();
  }

  /********************************************************************************
   * Handles errors when the backend service fails to read plugin registry
   ********************************************************************************/

  async invalidRegistryFound(registry: ChePluginRegistry): Promise<void> {
    this.onInvalidRegistryFoundEmitter.fire(registry);
    console.log('Unable to read plugin registry', registry.internalURI);
  }

  async invalidPluginFound(pluginYaml: string): Promise<void> {
    console.log('Unable to read plugin meta.yaml', pluginYaml);
  }

  /********************************************************************************
   * Handles request from plugin service on installing plugin dependencies
   ********************************************************************************/

  protected readonly askToInstallDependenciesEvent = new Emitter<AskToInstallDependencies>();

  get onAskToInstallDependencies(): Event<AskToInstallDependencies> {
    return this.askToInstallDependenciesEvent.event;
  }

  async askToInstallDependencies(dependencies: PluginDependencies): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      const confirmation = new AskToInstallDependencies(dependencies.plugins, resolve);
      this.askToInstallDependenciesEvent.fire(confirmation);
    });
  }
}

export class AskToInstallDependencies {
  constructor(public dependencies: string[], private resolve: (value: boolean) => void) {}

  confirm(): void {
    this.resolve(true);
  }

  deny(): void {
    this.resolve(false);
  }
}
