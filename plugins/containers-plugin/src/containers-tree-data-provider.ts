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
import { ContainersService, IWorkspaceMachine } from './containers-service';

interface TreeNodeItem {
    id: string;
    name: string;
    tooltip: string;
    iconPath?: string;
    parentId?: string;
    commandId?: string
}

export class ContainersTreeDataProvider implements theia.TreeDataProvider<TreeNodeItem> {
    private ids: string[];
    private treeNodeItems: TreeNodeItem[];
    private onDidChangeTreeDataEmitter: theia.EventEmitter<undefined>;

    readonly onDidChangeTreeData: theia.Event<undefined>;

    constructor() {
        this.ids = [];
        this.treeNodeItems = [];

        this.onDidChangeTreeDataEmitter = new theia.EventEmitter<undefined>();
        this.onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

        const containersService = new ContainersService();

        this.updateContainersTreeData(containersService).then(() => {
            this.onDidChangeTreeDataEmitter.fire();
        });
    }

    private async updateContainersTreeData(containersService: ContainersService): Promise<void> {
        this.ids.length = 0;
        this.treeNodeItems.length = 0;
        await containersService.updateMachines();
        containersService.machines.forEach((machine: IWorkspaceMachine) => {
            const treeItem: TreeNodeItem = {
                id: this.getRandId(),
                name: machine.machineName,
                tooltip: `workspace container status ${machine.status}`
            };
            switch (machine.status) {
                case 'STARTING':
                    treeItem.iconPath = 'fa-circle medium-yellow';
                    break;
                case 'RUNNING':
                    treeItem.iconPath = 'fa-circle medium-green';
                    break;
                case 'FAILED':
                    treeItem.iconPath = 'fa-circle medium-red';
                    break;
                default:
                    treeItem.iconPath = 'fa-circle-o';
            }
            this.treeNodeItems.push(treeItem);
            this.treeNodeItems.push({
                id: this.getRandId(),
                parentId: treeItem.id,
                name: 'terminal',
                iconPath: 'fa-terminal',
                tooltip: `new terminal for ${machine.machineName}`,
                commandId: `terminal-for-${machine.machineName}-container:new`
            });
            const servers = machine.servers;
            if (!servers) {
                return;
            }
            Object.keys(servers).forEach((serverName: string) => {
                const server = servers[serverName];
                if (!server || !server.url) {
                    return;
                }
                this.treeNodeItems.push({
                    id: this.getRandId(),
                    parentId: treeItem.id,
                    name: ` [${serverName}](${server.url})`,
                    tooltip: server.url
                });
            });
        });
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

    getTreeItem(element: TreeNodeItem): theia.TreeItem {
        const treeItem: theia.TreeItem = {
            label: element.name,
            tooltip: element.tooltip
        };
        if (element.parentId === undefined) {
            treeItem.collapsibleState = theia.TreeItemCollapsibleState.Expanded;
        }
        if (element.iconPath) {
            treeItem.iconPath = element.iconPath
        }
        if (element.commandId) {
            treeItem.command = { id: element.commandId }
        }
        return treeItem;
    }

    getChildren(element?: TreeNodeItem): TreeNodeItem[] {
        if (element) {
            return this.treeNodeItems.filter(item => item.parentId === element.id);
        } else {
            return this.treeNodeItems.filter(item => item.parentId === undefined);
        }
    }
}
