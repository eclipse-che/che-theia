/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as theia from '@theia/plugin';
import { IContainer } from './containers-service';

interface ITreeNodeItem {
    id: string;
    name: string;
    tooltip: string;
    iconPath?: string;
    parentId?: string;
    command?: {
        id: string;
        arguments?: string[]
    },
    isExpanded?: boolean;
}

export class ContainersTreeDataProvider implements theia.TreeDataProvider<ITreeNodeItem> {
    private ids: string[];
    private treeNodeItems: ITreeNodeItem[];
    private onDidChangeTreeDataEmitter: theia.EventEmitter<undefined>;

    readonly onDidChangeTreeData: theia.Event<undefined>;

    constructor() {
        this.ids = [];
        this.treeNodeItems = [];

        this.onDidChangeTreeDataEmitter = new theia.EventEmitter<undefined>();
        this.onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;
    }

    updateContainersTreeData(containers: IContainer[]): void {
        this.ids.length = 0;
        this.treeNodeItems.length = 0;
        const pluginsDir = {
            id: this.getRandId(),
            name: 'plugins',
            tooltip: 'che-plugin containers',
            isExpanded: false
        };
        let hasPlugin = false;

        containers.forEach((container: IContainer) => {
            const treeItem: ITreeNodeItem = {
                id: this.getRandId(),
                name: container.name,
                tooltip: 'container name',
                isExpanded: true
            };
            switch (container.status) {
                case 'STARTING':
                    treeItem.iconPath = 'fa-circle medium-yellow';
                    treeItem.tooltip = 'container is STARTING';
                    break;
                case 'RUNNING':
                    treeItem.iconPath = 'fa-circle medium-green';
                    treeItem.tooltip = 'container is RUNNING';
                    break;
                case 'FAILED':
                    treeItem.iconPath = 'fa-circle medium-red';
                    treeItem.tooltip = 'container is FAILED';
                    break;
                default:
                    treeItem.iconPath = 'fa-circle-o';
            }
            if (container.isDev) {
                treeItem.tooltip = 'dev ' + treeItem.tooltip;
            } else {
                hasPlugin = true;
                treeItem.tooltip = 'che-plugin ' + treeItem.tooltip;
                treeItem.parentId = pluginsDir.id;
            }
            this.treeNodeItems.push(treeItem);
            this.treeNodeItems.push({
                id: this.getRandId(),
                parentId: treeItem.id,
                name: 'New terminal',
                iconPath: 'fa-terminal medium-yellow',
                tooltip: `open a new terminal for ${container.name}`,
                command: { id: `terminal-for-${container.name}-container:new` }
            });
            const servers = container.servers;
            if (!servers) {
                return;
            }
            const serverKeys = Object.keys(servers);
            if (!serverKeys.length) {
                return;
            }
            const endpointsId = this.getRandId();
            this.treeNodeItems.push({
                id: endpointsId,
                parentId: treeItem.id,
                name: 'endpoints',
                tooltip: 'endpoints',
                isExpanded: true
            });
            serverKeys.forEach((serverName: string) => {
                const server = servers[serverName];
                if (!server) {
                    return;
                }
                const treeNodeItem: ITreeNodeItem = {
                    id: this.getRandId(),
                    parentId: endpointsId,
                    name: serverName,
                    iconPath: 'fa-info-circle medium-blue',
                    tooltip: server.url ? server.url : 'endpoint'
                };
                if (server.url && server.url.startsWith('http')) {
                    treeNodeItem.name = serverName;
                    treeNodeItem.iconPath = 'fa-share medium-blue';
                    treeNodeItem.command = { id: 'theia.open', arguments: [server.url] };
                    treeNodeItem.tooltip = 'open in a new tab  ' + treeNodeItem.tooltip;
                }
                this.treeNodeItems.push(treeNodeItem);
            });
        });
        if (hasPlugin) {
            this.treeNodeItems.push(pluginsDir);
        }
        this.onDidChangeTreeDataEmitter.fire();
    }

    private getRandId(): string {
        let uniqueId = '';
        for (let counter = 0; counter < 1000; counter++) {
            uniqueId = `${('0000' + (Math.random() * Math.pow(36, 4) << 0).toString(36)).slice(-4)}`;
            if (this.ids.findIndex(id => id === uniqueId) === -1) {
                break;
            }
        }
        this.ids.push(uniqueId);
        return uniqueId;
    }

    dispose(): void {
        this.onDidChangeTreeDataEmitter.dispose();
    }

    getTreeItem(element: ITreeNodeItem): theia.TreeItem {
        const treeItem: theia.TreeItem = {
            label: element.name,
            tooltip: element.tooltip
        };
        if (element.isExpanded === true) {
            treeItem.collapsibleState = theia.TreeItemCollapsibleState.Expanded;
        } else if (element.isExpanded === false) {
            treeItem.collapsibleState = theia.TreeItemCollapsibleState.Collapsed;
        } else {
            treeItem.collapsibleState = theia.TreeItemCollapsibleState.None;
        }
        if (element.iconPath) {
            treeItem.iconPath = element.iconPath;
        }
        if (element.command) {
            treeItem.command = element.command;
        }
        return treeItem;
    }

    getChildren(element?: ITreeNodeItem): ITreeNodeItem[] {
        if (element) {
            return this.treeNodeItems.filter(item => item.parentId === element.id);
        } else {
            return this.treeNodeItems.filter(item => item.parentId === undefined);
        }
    }
}
