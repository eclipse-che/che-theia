/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as che from '@eclipse-che/plugin';
import * as theia from '@theia/plugin';

import { Container, MetricContainer, Metrics, Pod } from './objects';
import { SHOW_RESOURCES_INFORMATION_COMMAND, Units } from './constants';
import { converToBytes, convertToMilliCPU } from './units-converter';

export async function start(context: theia.PluginContext): Promise<void> {
  const namespace = await getNamespace();
  const resourceMonitor = new ResMon(context, namespace);
  resourceMonitor.show();
}

export class ResMon {
  private METRICS_SERVER_ENDPOINT = '/apis/metrics.k8s.io/v1beta1/';
  private METRICS_REQUEST_URL = `${this.METRICS_SERVER_ENDPOINT}namespaces/`;

  private statusBarItem: theia.StatusBarItem;
  private containers: Container[] = [];
  private namespace: string;

  constructor(context: theia.PluginContext, namespace: string) {
    context.subscriptions.push(
      theia.commands.registerCommand(SHOW_RESOURCES_INFORMATION_COMMAND, () => this.showDetailedInfo())
    );

    this.namespace = namespace;
    this.statusBarItem = theia.window.createStatusBarItem(theia.StatusBarAlignment.Left);
    this.statusBarItem.color = '#FFFFFF';
    this.statusBarItem.show();
    this.statusBarItem.command = SHOW_RESOURCES_INFORMATION_COMMAND.id;
  }

  async show(): Promise<void> {
    await this.getContainersInfo();
    await this.requestMetricsServer();
  }

  async getContainersInfo(): Promise<Container[]> {
    const requestURL = `/api/v1/namespaces/${this.namespace}/pods/${process.env.HOSTNAME}`;
    const opts = { url: `${this.METRICS_REQUEST_URL}${this.namespace}/pods` };
    const response: che.K8SRawResponse = await che.k8s.sendRawQuery(requestURL, opts);
    if (response.statusCode !== 200) {
      throw new Error(`Cannot read Pod information. Status code: ${response.statusCode}. Error: ${response.data}`);
    }
    const pod: Pod = JSON.parse(response.data);
    pod.spec.containers.forEach(element => {
      this.containers.push({
        name: element.name,
        cpuLimit: convertToMilliCPU(element.resources.limits.cpu),
        memoryLimit: converToBytes(element.resources.limits.memory),
      });
    });
    return this.containers;
  }

  async requestMetricsServer(): Promise<void> {
    const result = await che.k8s.sendRawQuery(this.METRICS_SERVER_ENDPOINT, { url: this.METRICS_SERVER_ENDPOINT });
    if (result.statusCode !== 200) {
      throw new Error(`Cannot connect to Metrics Server. Status code: ${result.statusCode}. Error: ${result.data}`);
    }
    setInterval(() => this.getMetrics(), 5000);
  }

  async getMetrics(): Promise<Container[]> {
    const requestURL = `${this.METRICS_REQUEST_URL}${this.namespace}/pods/${process.env.HOSTNAME}`;
    const opts = { url: `${this.METRICS_REQUEST_URL}${this.namespace}/pods` };
    const response = await che.k8s.sendRawQuery(requestURL, opts);
    if (response.statusCode !== 200) {
      return this.containers;
    }
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
        container.memoryUsed = converToBytes(element.usage.memory);
        return;
      }
    });
  }

  updateStatusBar(): void {
    let memTotal = 0;
    let memUsed = 0;
    let cpuUsed = 0;
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
    });
    const memoryValue = `$(ellipsis) Mem: ${(memUsed / Units.G).toFixed(2)}/${(memTotal / Units.G).toFixed(
      2
    )} GB ${Math.floor((memUsed / memTotal) * 100)}%`;
    const cpuValue = `$(pulse) CPU: ${cpuUsed} m`;

    this.statusBarItem.text = memoryValue + cpuValue;
  }

  showDetailedInfo(): void {
    const items: theia.QuickPickItem[] = [];
    this.containers.forEach(element => {
      const memUsed = element.memoryUsed ? (element.memoryUsed / Units.M).toFixed(2) : '';
      const memLimited = element.memoryLimit ? (element.memoryLimit / Units.M).toFixed(2) : '';
      const cpuUsed = element.cpuUsed;
      const cpuLimited = element.cpuLimit ? `${element.cpuLimit}m` : 'not set';

      items.push(<theia.QuickPickItem>{
        label: element.name,
        detail: `Mem (MB): ${memUsed} (Used) / ${memLimited} (Limited) | CPU : ${cpuUsed}m (Used) / ${cpuLimited} (Limited)`,
        showBorder: true,
      });
    });
    theia.window.showQuickPick(items, {});
  }
}

export async function getNamespace(): Promise<string> {
  const workspace = await che.workspace.getCurrentWorkspace();
  return workspace.attributes ? workspace.attributes.infrastructureNamespace : '';
}
