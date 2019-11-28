/********************************************************************************
 * Copyright (C) 2019 Red Hat, Inc. and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { injectable } from 'inversify';
import { ChePluginRegistry, ChePluginServiceClient } from '../../common/che-plugin-protocol';
import { Emitter, Event } from '@theia/core/lib/common';

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
     * Error handling
     * Will be imlemented soon
     ********************************************************************************/

    async invalidRegistryFound(registry: ChePluginRegistry): Promise<void> {
        console.log('Unable to read plugin registry', registry.uri);
    }

    async invaligPluginFound(pluginYaml: string): Promise<void> {
        console.log('Unable to read plugin meta.yaml', pluginYaml);
    }

}
