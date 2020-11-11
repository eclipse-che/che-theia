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
import * as k8s from '@kubernetes/client-node';
import * as theia from '@theia/plugin';

import { Container, MetricContainer, Metrics, Pod } from './objects';
import { convertMemory, convertToMilliCPU } from './units-converter';

import { ShowResourcesInformation } from './commands';
import { Units } from './constants';

const request = require('request');

export async function start(context: theia.PluginContext): Promise<void> {
  const namespace = await getNamespace();
  const resourceMonitor = new ResMon(context, namespace);
  resourceMonitor.show();
}

class ResMon {
  private METRICS_REQUEST_URL = '/apis/metrics.k8s.io/v1beta1/namespaces/';

  private statusBarItem: theia.StatusBarItem;
  private kc: k8s.KubeConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cluster: any;
  private opts: { url: string };
  private containers: Container[] = [];
  private namespace: string;

  constructor(context: theia.PluginContext, namespace: string) {
    context.subscriptions.push(theia.commands.registerCommand(ShowResourcesInformation, () => this.showDetailedInfo()));

    this.namespace = namespace;
    this.statusBarItem = theia.window.createStatusBarItem(theia.StatusBarAlignment.Left);
    this.statusBarItem.color = '#FFFFFF';
    this.statusBarItem.show();
    this.statusBarItem.command = ShowResourcesInformation.id;

    this.kc = new k8s.KubeConfig();
    this.kc.loadFromCluster();
    this.opts = { url: `${this.METRICS_REQUEST_URL}${this.namespace}/pods` };
    this.kc.applyToRequest(this.opts);

    this.cluster = this.kc.getCurrentCluster();

    this.getContainers();
  }

  public show(): void {
    setInterval(() => this.getMetrics(), 5000);
  }

  private showDetailedInfo(): void {
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

  private getContainers(): void {
    if (!this.cluster) {
      console.error('Cluster is not defined');
      return;
    }

    const requestURL = `${this.cluster.server}/api/v1/namespaces/${this.namespace}/pods/${process.env.HOSTNAME}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request.get(requestURL, this.opts, (error: any, response: { statusCode: any }, body: any) => {
      if (error) {
        console.error(`error: ${error}`);
        return;
      }
      if (response && response.statusCode !== 200) {
        return;
      }
      const pod: Pod = JSON.parse(body);
      pod.spec.containers.forEach(element => {
        this.containers.push({
          name: element.name,
          cpuLimit: convertToMilliCPU(element.resources.limits.cpu),
          memoryLimit: convertMemory(element.resources.limits.memory),
        });
      });
    });
  }

  private getMetrics(): void {
    if (!this.cluster) {
      console.error('Cluster is not defined');
      return;
    }

    const requestURL = `${this.cluster.server}${this.METRICS_REQUEST_URL}${this.namespace}/pods/${process.env.HOSTNAME}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request.get(requestURL, this.opts, (error: any, response: { statusCode: any }, body: any) => {
      if (error) {
        console.error(`error: ${error}`);
        return;
      }
      if (response && response.statusCode !== 200) {
        return;
      }
      const pod: Metrics = JSON.parse(body);
      pod.containers.forEach(element => {
        this.setUsedResources(element);
      });
      this.updateStatusBar();
    });
  }

  private setUsedResources(element: MetricContainer): void {
    this.containers.map(container => {
      if (container.name === element.name) {
        container.cpuUsed = convertToMilliCPU(element.usage.cpu);
        container.memoryUsed = convertMemory(element.usage.memory);
        return;
      }
    });
  }

  private updateStatusBar(): void {
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
}

export async function getNamespace(): Promise<string> {
  const workspace = await che.workspace.getCurrentWorkspace();
  return workspace.attributes ? workspace.attributes.infrastructureNamespace : '';
}

export function stop() {}
