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

import { injectable, inject, postConstruct } from 'inversify';
import { Message } from '@phosphor/messaging';
import { AlertMessage } from '@theia/core/lib/browser/widgets/alert-message';
import * as React from 'react';
import { ChePlugin } from '../../common/che-plugin-protocol';
import { ChePluginServiceClientImpl } from './che-plugin-service-client';
import { ChePluginManager } from './che-plugin-manager';
import { ChePluginMenu } from './che-plugin-menu';
import { ConfirmDialog } from '@theia/core/lib/browser';
import { ChePluginViewToolbar } from './che-plugin-view-toolbar';
import { ChePluginViewList } from './che-plugin-view-list';
import { PluginWidget } from '@theia/plugin-ext/lib/main/browser/plugin-ext-widget';

export type PluginViewState =
    'updating_cache' |
    'filtering' |
    'loading' |
    'failed';

@injectable()
export class ChePluginView extends PluginWidget {

    protected initialized = false;

    protected filterString: string = '';
    protected highlighters: string[] = [];

    protected plugins: ChePlugin[] = [];

    protected status: PluginViewState = 'updating_cache';

    protected showRestartWorkspaceNotification = false;
    protected hidingRestartWorkspaceNotification = false;

    protected pluginCacheSize: number = 0;
    protected pluginsCached: number = 0;

    constructor(
        @inject(ChePluginManager) protected chePluginManager: ChePluginManager,
        @inject(ChePluginMenu) protected chePluginMenu: ChePluginMenu,
        @inject(ChePluginServiceClientImpl) protected chePluginServiceClient: ChePluginServiceClientImpl
    ) {
        super();
        this.id = 'che-plugins';
        this.title.iconClass = 'fa che-plugins-tab-icon';

        this.node.ondrop = event => {
            event.preventDefault();
            const text = event.dataTransfer!.getData('text');
            this.onDrop(text);
        };

        this.node.ondragover = event => {
            event.preventDefault();
        };
    }

    @postConstruct()
    protected init(): void {
        this.toDispose.push(this.chePluginManager.onWorkspaceConfigurationChanged(needToRestart => this.onWorkspaceConfigurationChanged()));
        this.toDispose.push(this.chePluginManager.onPluginRegistryListChanged(() => this.updateCache()));
        this.toDispose.push(this.chePluginMenu.onChangeFilter(filter => this.onChangeFilter(filter)));
        this.toDispose.push(this.chePluginMenu.onRefreshPluginList(() => this.updateCache()));
        this.toDispose.push(this.chePluginServiceClient.onPluginCacheSizeChanged(plugins => this.onPluginCacheSizeChanged(plugins)));
        this.toDispose.push(this.chePluginServiceClient.onPluginCached(plugins => this.onPluginCached(plugins)));
        this.toDispose.push(this.chePluginServiceClient.onCachingComplete(() => this.onCachingComplete()));
    }

    protected onAfterShow(msg: Message): void {
        super.onAfterShow(msg);

        if (!this.initialized) {
            this.initialized = true;

            this.updateCache();
        }
    }

    protected async onWorkspaceConfigurationChanged(): Promise<void> {
        this.showRestartWorkspaceNotification = true;
        this.filter();
    }

    protected async onPluginCacheSizeChanged(plugins: number): Promise<void> {
        this.pluginCacheSize = plugins;
        this.update();
    }

    protected async onPluginCached(plugins: number): Promise<void> {
        this.pluginsCached = plugins;
        this.update();
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // UPDATING CACHE
    //
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Updates plugin cache.
     *
     * Switches to 'update_cache' state.
     */
    protected async updateCache(): Promise<void> {
        this.pluginCacheSize = 0;
        this.pluginsCached = 0;

        try {
            this.status = 'updating_cache';
            this.update();

            await this.chePluginManager.updateCache();
        } catch (error) {
            this.status = 'failed';
            console.log(error);
        }

        this.update();
    }

    protected async onCachingComplete(): Promise<void> {
        this.status = 'filtering';
        this.filterString = '';
        this.filter();
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // FILTERING
    //
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * User has changed Toolbar filter field
     */
    protected onFilterChanged(filter: string): void {
        this.filterString = filter;

        if (this.status === 'filtering') {
            this.filter();
        }
    }

    /**
     * Request from Plugin view Menu to shange current filter
     */
    protected onChangeFilter(filter: string): void {
        if (this.status === 'filtering') {
            this.filterString = filter;
            this.filter();
        }
    }

    /**
     * Filters plugins
     */
    protected async filter(): Promise<void> {
        try {
            this.plugins = await this.chePluginManager.getPlugins(this.filterString);

            this.highlighters = this.filterString.split(' ').filter(f => {
                if (f && !f.startsWith('@')) {
                    return true;
                }

                return false;
            });
        } catch (error) {
            console.log(error);
            this.plugins = [];
        }

        this.update();
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // INSTALLING VSCODE EXTENSIONS
    //
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////

    protected async installExtension(extension: string): Promise<boolean> {
        this.status = 'loading';
        this.update();

        const installed = await this.chePluginManager.installVSCodeExtension(extension);

        this.showRestartWorkspaceNotification = true;
        this.update();

        this.filterString = '';
        this.status = 'filtering';
        await this.filter();

        return installed;
    }

    protected async onDrop(input: string): Promise<void> {
        const extension = this.chePluginManager.checkVsCodeExtension(input);
        if (extension) {
            const confirm = new ConfirmDialog({
                title: 'Install extension',
                msg: `You are going to install VS Code extension '${extension}'`,
                ok: 'Install'
            });

            if (await confirm.open()) {
                if (await this.installExtension(input)) {
                    return;
                }
            }
        }
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // RENDERING
    //
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////

    protected renderState(): React.ReactNode {
        switch (this.status) {
            case 'updating_cache':
                return this.renderStateUpdatingCache();
            case 'filtering':
                return this.renderStateFiltering();
            case 'loading':
                return this.renderStateLoading();
            case 'failed':
                return this.renderStateFailed();
        }

        return undefined;
    }

    protected render(): React.ReactNode {

        const toolbar = <ChePluginViewToolbar
            chePluginMenu={this.chePluginMenu}
            filter={this.filterString}
            onFilterChanged={filter => this.onFilterChanged(filter)}
            status={this.status} />;

        return <React.Fragment>
            {this.renderUpdateWorkspaceNotification()}
            {toolbar}
            {this.renderState()}
        </React.Fragment>;
    }

    // Restart your workspace to apply changes
    protected renderUpdateWorkspaceNotification(): React.ReactNode {
        if (this.showRestartWorkspaceNotification) {

            const restartEnabled = this.chePluginManager.restartEnabled();

            let notificationStyle = this.hidingRestartWorkspaceNotification ? 'notification hiding' : 'notification';
            if (restartEnabled) {
                notificationStyle += ' notification-button-panel';
            }

            const notification = restartEnabled ?
                <div className='notification-button' onClick={this.onRestartWorkspaceNotificationClicked}
                    title='Click to restart your workspace with applying changes'>
                    <div className='notification-message-icon'><i className='fa fa-check-circle'></i></div>
                    <div className='notification-message-text'>Click here to apply changes and restart your workspace</div>
                </div>
                :
                <div className='notification-message'
                    title='Use dashboard to apply changes and restart your workspace'>
                    <div className='notification-message-icon'><i className='fa fa-exclamation-triangle'></i></div>
                    <div className='notification-message-text'>Use dashboard to apply changes and restart your workspace</div>
                </div>;

            return <div className='che-plugins-notification'>
                <div className={notificationStyle}>
                    {notification}
                    <div className='notification-control'>
                        <div className='notification-hide' onClick={this.hideNotification} title='Hide'>
                            <i className='fa fa-close alert-close' ></i>
                        </div>
                    </div>
                </div>
            </div>;
        }

        return undefined;
    }

    // 'update_cache'
    protected renderStateUpdatingCache(): React.ReactNode {
        return <div className='che-plugins-caching'>
            <div className='che-plugins-caching-spinner'>
                <div className='spinnerContainer'>
                    <div className='fa fa-spinner fa-pulse fa-3x fa-fw'></div>
                </div>
            </div>
            <div className='che-plugins-caching-progress'>
                <div className='che-plugins-caching-progress-label'>
                    Reading plugins...
                </div>
                <div className='che-plugins-caching-progress-status'>
                    <b>{this.pluginsCached}</b> from <b>{this.pluginCacheSize}</b>
                </div>
            </div>
        </div>;
    }

    protected renderStateLoading(): React.ReactNode {
        return <div className='spinnerContainer'>
            <div className='fa fa-spinner fa-pulse fa-3x fa-fw'></div>
        </div>;
    }

    protected renderStateFailed(): React.ReactNode {
        return <AlertMessage type='ERROR' header='Your registry is invalid' />;
    }

    protected renderStateFiltering(): React.ReactNode {
        if (!this.plugins.length) {
            return <AlertMessage type='INFO' header='There are no plugins matching your filter' />;
        }

        return <ChePluginViewList
            pluginManager={this.chePluginManager}
            plugins={this.plugins}
            highlighters={this.highlighters} />;
    }

    protected onRestartWorkspaceNotificationClicked = async () => {
        await this.chePluginManager.restartWorkspace();
    };

    protected hideNotification = async () => {
        this.hidingRestartWorkspaceNotification = true;
        this.update();

        setTimeout(() => {
            this.showRestartWorkspaceNotification = false;
            this.hidingRestartWorkspaceNotification = false;
            this.update();
        }, 500);
    };

}
