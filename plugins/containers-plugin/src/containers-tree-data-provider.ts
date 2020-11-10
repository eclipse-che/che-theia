/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as theia from '@theia/plugin';

import { IContainer } from './containers-service';
import { TaskScope } from '@eclipse-che/plugin';

interface ITreeNodeItem {
  id: string;
  name: string;
  tooltip: string;
  iconPath?: string;
  parentId?: string;
  command?: {
    id: string;
    arguments?: string[];
  };
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
    const runtimesGroup = {
      id: this.getRandId(),
      name: 'User Runtimes',
      tooltip: 'user defined containers',
      isExpanded: true,
    };
    const pluginsGroup = {
      id: this.getRandId(),
      name: 'Plugins',
      tooltip: 'che-plugin containers',
      isExpanded: false,
    };
    let hasPlugin = false;
    let hasRuntimeContainers = false;

    containers.forEach((container: IContainer) => {
      // container node
      const containerNode: ITreeNodeItem = {
        id: this.getRandId(),
        name: container.name,
        tooltip: 'container name',
      };
      switch (container.status) {
        case 'STARTING':
          containerNode.iconPath = 'fa-circle medium-yellow';
          containerNode.tooltip = 'container is STARTING';
          break;
        case 'RUNNING':
          containerNode.iconPath = 'fa-circle medium-green';
          containerNode.tooltip = 'container is RUNNING';
          break;
        case 'FAILED':
          containerNode.iconPath = 'fa-circle medium-red';
          containerNode.tooltip = 'container is FAILED';
          break;
        default:
          containerNode.iconPath = 'fa-circle-o';
      }
      if (container.isDev) {
        hasRuntimeContainers = true;
        containerNode.tooltip = 'dev ' + containerNode.tooltip;
        containerNode.parentId = runtimesGroup.id;
        containerNode.isExpanded = true;
      } else {
        hasPlugin = true;
        containerNode.tooltip = 'che-plugin ' + containerNode.tooltip;
        containerNode.parentId = pluginsGroup.id;
        containerNode.isExpanded = false;
      }
      this.treeNodeItems.push(containerNode);

      // terminal
      this.treeNodeItems.push({
        id: this.getRandId(),
        parentId: containerNode.id,
        name: 'New terminal',
        iconPath: 'fa-terminal medium-yellow',
        tooltip: `open a new terminal for ${container.name}`,
        command: { id: 'terminal-in-specific-container:new', arguments: [container.name] },
      });

      // commands
      if (container.commands && container.commands.length) {
        if (!container.isDev) {
          // if there is a command in a plugin container, expand whole plugins containers group
          pluginsGroup.isExpanded = true;
          // if there is a command defined for this plugin container, show its items by default
          containerNode.isExpanded = true;
        }
        container.commands.forEach((command: { commandName: string; commandLine: string }) => {
          this.treeNodeItems.push({
            id: this.getRandId(),
            parentId: containerNode.id,
            name: command.commandName,
            tooltip: command.commandLine,
            iconPath: 'fa-cogs medium-yellow',
            command: {
              id: CONTAINERS_PLUGIN_RUN_TASK_COMMAND_ID,
              arguments: [command.commandName, container.name],
            },
          });
        });
      }

      // routes
      const serverKeys = container.servers ? Object.keys(container.servers) : [];
      if (serverKeys.length) {
        serverKeys.forEach((serverName: string) => {
          const server = container.servers![serverName];
          if (!server) {
            return;
          }
          const treeNodeItem: ITreeNodeItem = {
            id: this.getRandId(),
            parentId: containerNode.id,
            name: serverName,
            iconPath: 'fa-info-circle medium-blue',
            tooltip: server.url ? server.url : 'endpoint',
          };
          if (server.url && server.url.startsWith('http')) {
            treeNodeItem.name = serverName;
            treeNodeItem.iconPath = 'fa-external-link medium-blue';
            treeNodeItem.command = { id: 'theia.open', arguments: [server.url] };
            treeNodeItem.tooltip = 'open in a new tab  ' + treeNodeItem.tooltip;
          }
          this.treeNodeItems.push(treeNodeItem);
        });
      }

      // environment
      const envKeys = container.env ? Object.keys(container.env) : [];
      if (envKeys.length) {
        const envsId = this.getRandId();
        this.treeNodeItems.push({
          id: envsId,
          parentId: containerNode.id,
          name: 'env',
          tooltip: 'environment variables',
          isExpanded: false,
        });
        envKeys.forEach((envName: string) => {
          this.treeNodeItems.push({
            id: this.getRandId(),
            parentId: envsId,
            name: `${envName} : ${container.env![envName]}`,
            tooltip: `environment variable ${envName}`,
            iconPath: 'fa-info-circle medium-blue',
          });
        });
      }

      // volumes
      const volumesKeys = container.volumes ? Object.keys(container.volumes) : [];
      if (volumesKeys.length) {
        const volumesId = this.getRandId();
        this.treeNodeItems.push({
          id: volumesId,
          parentId: containerNode.id,
          name: 'volumes',
          tooltip: 'volumes',
          isExpanded: false,
        });
        volumesKeys.forEach((volumeName: string) => {
          const volume: {
            [paramRef: string]: string | undefined;
          } = container.volumes![volumeName];
          if (!volume) {
            return;
          }
          const volumeId = this.getRandId();
          this.treeNodeItems.push({
            id: volumeId,
            parentId: volumesId,
            name: volumeName,
            tooltip: 'volume name',
            isExpanded: true,
          });
          Object.keys(volume).forEach((key: string) => {
            this.treeNodeItems.push({
              id: this.getRandId(),
              parentId: volumeId,
              name: `${key} : ${volume[key]}`,
              tooltip: `volume ${volumeName}`,
              iconPath: 'fa-info-circle medium-blue',
            });
          });
        });
      }
    });

    if (!hasRuntimeContainers) {
      this.treeNodeItems.push({
        id: this.getRandId(),
        parentId: runtimesGroup.id,
        name: 'No runtime containers',
        tooltip: 'No runtime containers are specified in workspace configuration',
      });
    }
    this.treeNodeItems.push(runtimesGroup);

    if (!hasPlugin) {
      this.treeNodeItems.push({
        id: this.getRandId(),
        parentId: pluginsGroup.id,
        name: 'No plugins defined',
        tooltip: 'No plugins are specified in workspace configuration',
      });
    }
    this.treeNodeItems.push(pluginsGroup);

    this.onDidChangeTreeDataEmitter.fire();
  }

  private getRandId(): string {
    let uniqueId = '';
    for (let counter = 0; counter < 1000; counter++) {
      uniqueId = `${('0000' + ((Math.random() * Math.pow(36, 4)) << 0).toString(36)).slice(-4)}`;
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
      tooltip: element.tooltip,
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

export const CONTAINERS_PLUGIN_RUN_TASK_COMMAND_ID = 'containers-plugin-run-task';
/**
 * Command handler which is invoked when a user clicks on a task in the Workspace panel.
 * This is needed if a command doesn't have container to be run in specified.
 * In such case we run the command in the container under which this command was clicked.
 */
export async function containersTreeTaskLauncherCommandHandler(label: string, containerName: string): Promise<void> {
  const tasks: theia.Task[] = await theia.tasks.fetchTasks({ type: 'che' });
  for (const task of tasks) {
    if (task.name === label) {
      // task labels are unique in the workspace
      if (!task.definition.target) {
        task.definition.target = {};
      }
      task.definition.target.containerName = containerName;

      theia.tasks.executeTask(task);
      return;
    }
  }

  // Shouldn't happen. Fallback to default behaviour.
  theia.commands.executeCommand('task:run', 'che', label, TaskScope.Global);
}
