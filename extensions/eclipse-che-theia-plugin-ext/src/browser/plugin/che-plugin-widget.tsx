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

import { injectable, inject } from 'inversify';
import { Message } from '@phosphor/messaging';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { AlertMessage } from '@theia/core/lib/browser/widgets/alert-message';
import * as React from 'react';
import { ChePluginRegistry, ChePlugin } from '../../common/che-protocol';
import { ChePluginManager } from './che-plugin-manager';
import { ChePluginMenu } from './che-plugin-menu';
import { Key } from '@theia/core/lib/browser';
import { ConfirmDialog } from '@theia/core/lib/browser';

export type PluginStatus = 'not_installed' | 'installed' | 'installing' | 'removing';

@injectable()
export class ChePluginWidget extends ReactWidget {

    protected plugins: ChePlugin[] = [];

    protected status: 'ready' | 'loading' | 'failed' = 'loading';

    protected needToBeRendered = true;

    protected needToRestartWorkspace = false;
    protected hidingRestartWorkspaceNotification = false;

    protected currentFilter: string;

    constructor(
        @inject(ChePluginManager) protected chePluginManager: ChePluginManager,
        @inject(ChePluginMenu) protected chePluginMenu: ChePluginMenu
    ) {
        super();
        this.id = 'che-plugins';
        this.title.label = 'Plugins';
        this.title.caption = 'Plugins';
        this.title.iconClass = 'fa che-plugins-tab-icon';
        this.title.closable = true;
        this.addClass('theia-plugins');

        this.node.tabIndex = 0;

        chePluginManager.onPluginRegistryChanged(
            registry => this.onPluginRegistryChanged(registry));

        chePluginManager.onWorkspaceConfigurationChanged(
            needToRestart => this.onWorkspaceConfigurationChanged(needToRestart));

        chePluginManager.onFilterChanged(
            filter => this.updateFilter(filter, true));

        this.node.ondrop = event => {
            event.preventDefault();
            const text = event.dataTransfer.getData('text');
            this.onDrop(text);
        };

        this.node.ondragover = event => {
            event.preventDefault();
        };
    }

    protected onAfterShow(msg: Message) {
        super.onAfterShow(msg);

        if (this.needToBeRendered) {
            this.needToBeRendered = false;

            this.update();
            this.updatePlugins();
        }
    }

    protected onActivateRequest(msg: Message) {
        super.onActivateRequest(msg);

        this.node.focus();
    }

    protected async onPluginRegistryChanged(registry?: ChePluginRegistry): Promise<void> {
        this.status = 'loading';
        this.update();

        await this.updatePlugins();
    }

    protected async onWorkspaceConfigurationChanged(needToRestart: boolean): Promise<void> {
        if (this.needToRestartWorkspace !== needToRestart) {
            this.needToRestartWorkspace = needToRestart;
            this.update();
        }
    }

    protected updateFilter = async (filter: string, reloadPlugins: boolean) => {
        this.currentFilter = filter;

        if (reloadPlugins) {
            this.status = 'loading';
            this.update();

            this.updatePlugins();
        }
    }

    protected clearFilter = async () => {
        this.currentFilter = '';

        this.status = 'ready';
        this.update();
    }

    protected async updatePlugins(): Promise<void> {
        try {
            this.plugins = await this.chePluginManager.getPlugins(this.currentFilter);
            this.status = 'ready';
        } catch (error) {
            this.status = 'failed';
        }

        this.update();
    }

    protected onChangeFilter = async (filter: string, enterPressed: boolean) => {
        // user may want to install plugin
        if (enterPressed) {
            if (this.chePluginManager.checkVsCodeExtension(filter)) {
                if (await this.installExtension(filter)) {
                    return;
                }
            }
        }

        await this.updateFilter(filter, enterPressed);
    }

    protected async onDrop(input: string) {
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

    protected async installExtension(extension: string): Promise<boolean> {
        this.currentFilter = '';

        this.status = 'loading';
        this.update();

        const installed = await this.chePluginManager.installVSCodeExtension(extension);
        this.needToRestartWorkspace = true;

        await this.updatePlugins();

        return installed;
    }

    protected render(): React.ReactNode {
        const chePluginListControls = <ChePluginListControls
            chePluginMenu={this.chePluginMenu}
            filter={this.currentFilter}
            update={this.onChangeFilter}
            status={this.status} />;

        return <React.Fragment>
            {this.renderUpdateWorkspaceNotification()}
            {chePluginListControls}
            {this.renderPluginList()}
        </React.Fragment>;
    }

    // Restart your workspace to apply changes
    protected renderUpdateWorkspaceNotification(): React.ReactNode {
        if (this.needToRestartWorkspace) {
            const notificationStyle = this.hidingRestartWorkspaceNotification ? 'notification hiding' : 'notification';
            return <div className='che-plugins-notification' >
                <div className={notificationStyle}>
                    <div className='notification-message' onClick={this.restartWorkspace}>
                        <i className='fa fa-check-circle'></i>&nbsp;
                        Click here to apply changes and restart your workspace
                    </div>

                    <div className='notification-control'>
                        <div className='notification-hide' onClick={this.hideNotification}>
                            <i className='fa fa-close alert-close' ></i>
                        </div>
                    </div>
                </div>
            </div>;
        }

        return undefined;
    }

    protected renderPluginList(): React.ReactNode {
        // STATUS: loading
        if (this.status === 'loading') {
            return <div className='spinnerContainer'>
                <div className='fa fa-spinner fa-pulse fa-3x fa-fw'></div>
            </div>;
        }

        // STATUS: failed
        if (this.status === 'failed') {
            return <AlertMessage type='ERROR' header='Your registry is invalid' />;
        }

        // STATUS: ready
        if (!this.plugins.length) {
            return <AlertMessage type='INFO' header='No plugins currently available' />;
        }

        const list = this.plugins.map(plugin =>
            <ChePluginListItem key={plugin.publisher + '/' + plugin.name}
                pluginItem={plugin} pluginManager={this.chePluginManager}></ChePluginListItem>);

        return <div className='che-plugin-list'>
            {list}
        </div>;
    }

    protected restartWorkspace = async e => {
        await this.chePluginManager.restartWorkspace();
    }

    protected hideNotification = async e => {
        this.hidingRestartWorkspaceNotification = true;
        this.update();

        setTimeout(() => {
            this.needToRestartWorkspace = false;
            this.hidingRestartWorkspaceNotification = false;
            this.update();
        }, 500);
    }

}

export class ChePluginListControls extends React.Component<
    {
        chePluginMenu: ChePluginMenu,
        filter: string,
        update: (filter: string, reloadPlugins: boolean) => void,
        status: string
    },
    { menuButtonPressed: boolean, filter: string }> {

    private defaultFilter: string;

    constructor(props: {
        chePluginMenu: ChePluginMenu,
        filter: string,
        update: (filter: string, reloadPlugins: boolean) => void,
        status: string
    }) {
        super(props);

        this.state = {
            menuButtonPressed: false,
            filter: props.filter
        };

        props.chePluginMenu.onMenuClosed(() => {
            this.setState({
                menuButtonPressed: false,
                filter: this.state.filter
            });
        });
    }

    protected readonly doFilter = (e: React.KeyboardEvent) => {
        if (e.target) {
            if (Key.ENTER.keyCode === e.keyCode) {
                const filter = (e.target as HTMLInputElement).value;
                this.props.update(filter, true);
            }
        }
    }

    protected readonly handleChange = event => {
        if (event.target) {
            this.setState(
                {
                    menuButtonPressed: false,
                    filter: event.target.value
                });

            this.props.update(event.target.value, false);
        }
    }

    render(): React.ReactNode {
        let value;
        if (this.props.filter !== undefined && this.props.filter !== this.defaultFilter) {
            this.defaultFilter = this.props.filter;
            value = this.props.filter;
            this.state = {
                menuButtonPressed: this.state.menuButtonPressed,
                filter: value
            };
        } else {
            value = this.state.filter;
        }

        const input = this.props.status === 'loading' ?
            <input
                className='search'
                type='text'
                value={value}
                onChange={this.handleChange}
                onKeyUp={this.doFilter}
                disabled
            /> : <input
                className='search'
                type='text'
                value={value}
                onChange={this.handleChange}
                onKeyUp={this.doFilter}
            />;

        return <div className='che-plugin-control-panel'>
            <div>
                {input}
                <div tabIndex={0} className={this.menuButtonStyle()} onFocus={this.onFocus} >
                    <i className='fa fa-ellipsis-v'></i>
                </div>
            </div>
        </div>;
    }

    protected menuButtonStyle(): string {
        if (this.state.menuButtonPressed) {
            return 'menu-button menu-button-active';
        } else {
            return 'menu-button';
        }
    }

    protected onFocus = async param => {
        const rect = document.activeElement.getBoundingClientRect();

        const left = rect.left;
        const top = rect.top + rect.height - 2;

        this.setState({
            menuButtonPressed: true,
            filter: this.state.filter
        });

        this.props.chePluginMenu.show(left, top);
    }

}

export class ChePluginListItem extends React.Component<
    { pluginManager: ChePluginManager; pluginItem: ChePlugin; },
    { pluginStatus: PluginStatus }
    > {

    constructor(props: { pluginManager: ChePluginManager; pluginItem: ChePlugin; }) {
        super(props);

        const status = props.pluginItem.installed ? 'installed' : 'not_installed';

        this.state = {
            pluginStatus: status
        };
    }

    render(): React.ReactNode {
        const plugin = this.props.pluginItem;
        const metadata = plugin.versionList[plugin.version];

        // I'm not sure whether 'key' attribute is necessary here
        return <div key={plugin.publisher + '/' + plugin.name} className='che-plugin'>
            <div className='che-plugin-content'>
                {this.renderIcon()}
                <div className='che-plugin-info'>
                    <div className='che-plugin-title'>
                        <div className='che-plugin-name'>{metadata.name}</div>
                        {this.renderPluginVersion()}
                    </div>
                    <div className='che-plugin-description'>
                        <div>
                            <div>{metadata.description}</div>
                        </div>
                    </div>
                    <div className='che-plugin-publisher'>
                        {metadata.publisher}
                        <span className='che-plugin-type'>{metadata.type}</span>
                    </div>
                    {this.renderAction()}
                </div>
            </div>
        </div>;
    }

    protected renderPluginVersion(): React.ReactNode {
        const plugin = this.props.pluginItem;

        const versions: string[] = [];
        Object.keys(plugin.versionList).forEach(version => versions.push(version));
        versions.reverse();

        return <select className='che-plugin-version' onChange={this.versionChanged} >
            {
                versions.map(version => {
                    if (version === plugin.version) {
                        return <option value={version} selected>{version}</option>;
                    } else {
                        return <option value={version}>{version}</option>;
                    }
                })
            }
        </select>;
    }

    protected renderIcon(): React.ReactNode {
        const plugin = this.props.pluginItem;
        const metadata = plugin.versionList[plugin.version];

        if (metadata.icon) {
            // return the icon
            return <div className='che-plugin-icon'>
                <img src={metadata.icon}></img>
            </div>;
        }

        // return default icon
        return <div className='che-plugin-default-icon'>
            <div className='fa fa-puzzle-piece fa-2x fa-fw'></div>
        </div>;
    }

    protected renderAction(): React.ReactNode {
        const plugin = this.props.pluginItem;
        const metadata = plugin.versionList[plugin.version];

        // Don't show the button for 'Che Editor' plugins and for built-in plugins
        if ('Che Editor' === metadata.type || metadata.builtIn) {
            return undefined;
        }

        switch (this.state.pluginStatus) {
            case 'installed':
                return <div className='che-plugin-action-remove' onClick={this.removePlugin}>Installed</div>;
            case 'installing':
                return <div className='che-plugin-action-installing'>Installing...</div>;
            case 'removing':
                return <div className='che-plugin-action-removing'>Removing...</div>;
        }

        // 'not_installed'
        return <div className='che-plugin-action-add' onClick={this.installPlugin}>Install</div>;
    }

    protected setStatus(status: PluginStatus): void {
        this.setState({
            pluginStatus: status
        });
    }

    protected installPlugin = async () => {
        const previousStatus = this.state.pluginStatus;
        this.setStatus('installing');

        const installed = await this.props.pluginManager.install(this.props.pluginItem);
        if (installed) {
            this.setStatus('installed');
        } else {
            this.setStatus(previousStatus);
        }
    }

    protected removePlugin = async () => {
        const previousStatus = this.state.pluginStatus;
        this.setStatus('removing');

        const removed = await this.props.pluginManager.remove(this.props.pluginItem);
        if (removed) {
            this.setStatus('not_installed');
        } else {
            this.setStatus(previousStatus);
        }
    }

    protected versionChanged = async (event: React.ChangeEvent<HTMLSelectElement>) => {
        const select: HTMLSelectElement = (window.event as Event).target as HTMLSelectElement;

        const plugin = this.props.pluginItem;
        const versionBefore = plugin.version;

        plugin.version = select.value;

        this.setState({
            pluginStatus: this.state.pluginStatus
        });

        if (plugin.installed) {
            await this.props.pluginManager.changeVersion(this.props.pluginItem, versionBefore);
        }
    }

}
