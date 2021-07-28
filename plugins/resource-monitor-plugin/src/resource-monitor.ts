/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as che from '@eclipse-che/plugin';
import * as theia from '@theia/plugin';

import { Container, MetricContainer, Metrics } from './objects';
import { SHOW_RESOURCES_INFORMATION_COMMAND, SHOW_WARNING_MESSAGE_COMMAND, Units } from './constants';
import { convertToBytes, convertToMilliCPU } from './units-converter';
import { inject, injectable } from 'inversify';

import { K8sHelper } from './k8s-helper';
import { V1Pod } from '@kubernetes/client-node';

@injectable()
export class ResourceMonitor {
  @inject(K8sHelper)
  private k8sHelper: K8sHelper;

  private METRICS_SERVER_ENDPOINT = '/apis/metrics.k8s.io/v1beta1/';
  private METRICS_REQUEST_URL = `${this.METRICS_SERVER_ENDPOINT}namespaces/`;
  private WARNING_COLOR = '#FFCC00';
  private DEFAULT_COLOR = '#FFFFFF';
  private DEFAULT_TOOLTIP = 'Workspace resources';
  private MONITOR_BANNED = '$(ban) Resources';
  private MONITOR_WAIT_METRICS = 'Waiting metrics...';

  private warningMessage = '';

  private statusBarItem: theia.StatusBarItem;
  private containers: Container[] = [];
  private namespace: string;

  constructor() {
    this.statusBarItem = theia.window.createStatusBarItem(theia.StatusBarAlignment.Left);
    this.statusBarItem.color = this.DEFAULT_COLOR;
    this.statusBarItem.show();
    this.statusBarItem.command = SHOW_RESOURCES_INFORMATION_COMMAND.id;
    this.statusBarItem.tooltip = 'Resources Monitor';
  }

  async start(context: theia.PluginContext, namespace: string): Promise<void> {
    context.subscriptions.push(
      theia.commands.registerCommand(SHOW_RESOURCES_INFORMATION_COMMAND, () => this.showDetailedInfo()),
      theia.commands.registerCommand(SHOW_WARNING_MESSAGE_COMMAND, () => this.showWarningMessage())
    );

    this.namespace = namespace;
    this.show();
  }

  async show(): Promise<void> {
    await this.getContainersInfo();
    await this.requestMetricsServer();
  }

  async getWorkspacePod(): Promise<V1Pod | undefined> {
    try {
      const { body } = await this.k8sHelper
        .getCoreApi()
        .listNamespacedPod(this.namespace, undefined, undefined, undefined, undefined, undefined);
      for (const item of body.items) {
        if (item.metadata?.name === process.env.HOSTNAME) {
          return item;
        }
      }
    } catch (e) {
      throw new Error('Cannot get workspace pod. ' + e);
    }
  }

  async getContainersInfo(): Promise<Container[]> {
    const wsPod = await this.getWorkspacePod();

    wsPod?.spec?.containers.forEach(element => {
      this.containers.push({
        name: element.name,
        cpuLimit: convertToMilliCPU(element.resources?.limits?.cpu),
        memoryLimit: convertToBytes(element.resources?.limits?.memory),
      });
    });
    return this.containers;
  }

  async requestMetricsServer(): Promise<void> {
    const result = await che.k8s.sendRawQuery(this.METRICS_SERVER_ENDPOINT, { url: this.METRICS_SERVER_ENDPOINT });
    if (result.statusCode !== 200) {
      this.statusBarItem.text = this.MONITOR_BANNED;
      this.warningMessage = "Resource monitor won't be displayed. Metrics Server is not enabled on the cluster.";
      this.statusBarItem.command = SHOW_WARNING_MESSAGE_COMMAND.id;
      throw new Error(`Cannot connect to Metrics Server. Status code: ${result.statusCode}. Error: ${result.data}`);
    }
    setInterval(() => this.getMetrics(), 5000);
  }

  async getMetrics(): Promise<Container[]> {
    const requestURL = `${this.METRICS_REQUEST_URL}${this.namespace}/pods/${process.env.HOSTNAME}`;
    const opts = { url: this.METRICS_SERVER_ENDPOINT };
    const response = await che.k8s.sendRawQuery(requestURL, opts);

    if (response.statusCode !== 200) {
      // wait when workspace pod's metrics will be available
      if (response.statusCode === 404) {
        this.statusBarItem.text = this.MONITOR_WAIT_METRICS;
      } else {
        this.statusBarItem.text = this.MONITOR_BANNED;
        this.warningMessage = `Resource monitor won't be displayed. Cannot read metrics: ${response.data}.`;
        this.statusBarItem.command = SHOW_WARNING_MESSAGE_COMMAND.id;
      }
      return this.containers;
    }
    this.statusBarItem.command = SHOW_RESOURCES_INFORMATION_COMMAND.id;
    const metrics: Metrics = JSON.parse(response.data);
    metrics.containers.forEach(element => {
      this.setUsedResources(element);
    });
    this.updateStatusBar();
    return this.containers;
  }

  setUsedResources(element: MetricContainer): void {
    this.containers.map(container => {
      if (container.name === element.name) {
        container.cpuUsed = convertToMilliCPU(element.usage.cpu);
        container.memoryUsed = convertToBytes(element.usage.memory);
        return;
      }
    });
  }

  updateStatusBar(): void {
    let memTotal = 0;
    let memUsed = 0;
    let cpuUsed = 0;
    let text = '';
    let color = this.DEFAULT_COLOR;
    let tooltip = this.DEFAULT_TOOLTIP;
    this.containers.forEach(element => {
      if (element.memoryLimit) {
        memTotal += element.memoryLimit;
      }
      if (element.memoryUsed) {
        memUsed += element.memoryUsed;
      }
      if (element.cpuUsed) {
        cpuUsed += element.cpuUsed;
      }
      // if a container uses more than 90% of limited memory, show it in status bar with warning color
      if (element.memoryLimit && element.memoryUsed && element.memoryUsed / element.memoryLimit > 0.9) {
        color = this.WARNING_COLOR;
        tooltip = `${element.name} container`;
        text = this.buildStatusBarMessage(element.memoryUsed, element.memoryLimit, element.cpuUsed);
      }
    });

    // show workspace resources in total
    if (color === this.DEFAULT_COLOR) {
      text = this.buildStatusBarMessage(memUsed, memTotal, cpuUsed);
    }

    this.statusBarItem.text = text;
    this.statusBarItem.color = color;
    this.statusBarItem.tooltip = tooltip;
  }

  buildStatusBarMessage(memoryUsed: number, memoryLimit: number, cpuUsaed: number | undefined): string {
    const unitId = memoryLimit > Units.G ? 'GB' : 'MB';
    const unit = memoryLimit > Units.G ? Units.G : Units.M;

    let used: number | string;
    let limited: number | string;
    const memPct = Math.floor((memoryUsed / memoryLimit) * 100);
    if (unit === Units.G) {
      used = (memoryUsed / unit).toFixed(2);
      limited = (memoryLimit / unit).toFixed(2);
    } else {
      used = Math.floor(memoryUsed / unit);
      limited = Math.floor(memoryLimit / unit);
    }
    let message = `$(ellipsis) Mem: ${used}/${limited} ${unitId} ${memPct}%`;
    if (cpuUsaed) {
      message = `${message} $(pulse) CPU: ${cpuUsaed} m`;
    }
    return message;
  }

  showDetailedInfo(): void {
    const items: theia.QuickPickItem[] = [];
    this.containers.forEach(element => {
      const memUsed = element.memoryUsed ? Math.floor(element.memoryUsed / Units.M) : '';
      const memLimited = element.memoryLimit ? Math.floor(element.memoryLimit / Units.M) : '';
      const cpuUsed = element.cpuUsed;
      const cpuLimited = element.cpuLimit ? `${element.cpuLimit}m` : 'not set';

      items.push(<theia.QuickPickItem>{
        label: element.name,
        detail: `Mem (MB): ${memUsed} (Used) / ${memLimited} (Limited) | CPU : ${cpuUsed}m (Used) / ${cpuLimited} (Limited)`,
      });
    });
    theia.window.showQuickPick(items, {});
  }

  showWarningMessage(): void {
    theia.window.showWarningMessage(this.warningMessage);
  }
}
