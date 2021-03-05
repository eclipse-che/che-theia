/**********************************************************************
 * Copyright (c) 2020-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as che from '@eclipse-che/plugin';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as resourceMonitorPlugin from '../src/resource-monitor-plugin';
import * as theia from '@theia/plugin';

import { Container } from '../src/objects';
import { ResMon } from '../src/resource-monitor-plugin';
import { SHOW_WARNING_MESSAGE_COMMAND } from '../src/constants';

describe('Test Resource Monitor Plugin', () => {
  const devfileMock = jest.fn();
  const sendRawQuery = jest.fn();
  const createStatusBar = jest.fn();
  process.env.HOSTNAME = 'workspace';

  let resMonitor: ResMon;

  const context: theia.PluginContext = {
    environmentVariableCollection: {
      persistent: false,
      append: jest.fn(),
      clear: jest.fn(),
      delete: jest.fn(),
      forEach: jest.fn(),
      get: jest.fn(),
      prepend: jest.fn(),
      replace: jest.fn(),
    },
    extensionPath: '',
    globalState: {
      get: jest.fn(),
      update: jest.fn(),
    },
    globalStoragePath: '',
    logPath: '',
    storagePath: '',
    subscriptions: [],
    workspaceState: {
      get: jest.fn(),
      update: jest.fn(),
    },
    asAbsolutePath: jest.fn(),
  };
  const statusBarItem: theia.StatusBarItem = {
    alignment: 1,
    color: '',
    text: '',
    tooltip: '',
    command: '',
    priority: 0,
    dispose: jest.fn(),
    hide: jest.fn(),
    show: jest.fn(),
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();

    che.k8s.sendRawQuery = sendRawQuery;

    // Prepare Namespace
    che.devfile.get = devfileMock;
    const attributes = { infrastructureNamespace: 'che-namespace' };
    const devfile = {
      metadata: {
        attributes,
      },
    };
    devfileMock.mockReturnValue(devfile);

    // Prepare StatusBarItem
    theia.window.createStatusBarItem = createStatusBar;
    createStatusBar.mockReturnValue(statusBarItem);
  });

  describe('getNamespace', () => {
    test('read che namespace', async () => {
      const namespace = await resourceMonitorPlugin.getNamespace();
      expect(namespace).toBe('che-namespace');
    });
  });

  describe('show', () => {
    test('Get Pod information returns bad status code', async () => {
      resMonitor = new ResMon(context, 'che-namespace');
      const response: che.K8SRawResponse = {
        data: 'internal server error',
        error: 'internal server error',
        statusCode: 500,
      };
      sendRawQuery.mockReturnValue(response);
      try {
        await resMonitor.show();
      } catch (error) {
        expect(statusBarItem.text).toBe('$(ban) Resources');
        expect(statusBarItem.command).toBe(SHOW_WARNING_MESSAGE_COMMAND.id);
        expect(error).toBeInstanceOf(Error);
        expect(error).toHaveProperty(
          'message',
          'Cannot read Pod information. Status code: 500. Error: internal server error'
        );
      }
      expect(che.k8s.sendRawQuery).toBeCalledTimes(1);
    });

    test('Read Pod and Metrics information', async () => {
      resMonitor = new ResMon(context, 'che-namespace');
      const json = await fs.readFile(path.join(__dirname, '_data', 'podInfo.json'), 'utf8');
      const pod: che.K8SRawResponse = {
        data: json,
        error: '',
        statusCode: 200,
      };
      const requestMetricServer: che.K8SRawResponse = {
        data: '',
        error: '',
        statusCode: 200,
      };
      sendRawQuery.mockReturnValueOnce(pod).mockReturnValueOnce(requestMetricServer);

      await resMonitor.show();

      expect(che.k8s.sendRawQuery).toBeCalledTimes(2);
    });
  });

  describe('getContainersInfo', () => {
    test('Read Pod information', async () => {
      const json = await fs.readFile(path.join(__dirname, '_data', 'podInfo.json'), 'utf8');
      const response: che.K8SRawResponse = {
        data: json,
        error: '',
        statusCode: 200,
      };
      sendRawQuery.mockReturnValue(response);
      resMonitor = new ResMon(context, 'che-namespace');

      const containers: Container[] = await resMonitor.getContainersInfo();

      expect(che.k8s.sendRawQuery).toBeCalledTimes(1);
      expect(che.k8s.sendRawQuery).toBeCalledWith('/api/v1/namespaces/che-namespace/pods/workspace', {
        url: '/apis/metrics.k8s.io/v1beta1/namespaces/che-namespace/pods',
      });
      expect(containers.length).toBe(5);
      expect(containers[0]).toEqual({ name: 'che-jwtproxy7yc7hvrc', cpuLimit: 500, memoryLimit: 2000000000 });
      expect(containers[1]).toEqual({ name: 'maven', cpuLimit: 0, memoryLimit: 1000000000 });
      expect(containers[2]).toEqual({ name: 'vscode-javauil', cpuLimit: 0, memoryLimit: 200000 });
      expect(containers[3]).toEqual({ name: 'che-machine-exec122', cpuLimit: 5000, memoryLimit: 20000 });
      expect(containers[4]).toEqual({ name: 'theia-idewf0', cpuLimit: 0, memoryLimit: 536870912 });
    });
  });

  describe('requestMetricsServer', () => {
    test('Throw an exception if Metrics server is not available', async () => {
      const response: che.K8SRawResponse = {
        data: 'service unavailable',
        error: 'service unavailable',
        statusCode: 503,
      };

      sendRawQuery.mockReturnValue(response);
      resMonitor = new ResMon(context, 'che-namespace');
      try {
        await resMonitor.requestMetricsServer();
      } catch (error) {
        expect(statusBarItem.text).toBe('$(ban) Resources');
        expect(statusBarItem.command).toBe(SHOW_WARNING_MESSAGE_COMMAND.id);
        expect(error).toBeInstanceOf(Error);
        expect(error).toHaveProperty(
          'message',
          'Cannot connect to Metrics Server. Status code: 503. Error: service unavailable'
        );
      }
      expect(che.k8s.sendRawQuery).toBeCalledTimes(1);
      expect(che.k8s.sendRawQuery).toBeCalledWith('/apis/metrics.k8s.io/v1beta1/', {
        url: '/apis/metrics.k8s.io/v1beta1/',
      });
    });

    test('Use interval to read metrics information', async () => {
      const success: che.K8SRawResponse = {
        data: '',
        error: '',
        statusCode: 200,
      };

      const error: che.K8SRawResponse = {
        data: '',
        error: '',
        statusCode: 500,
      };

      sendRawQuery.mockReturnValueOnce(success).mockReturnValue(error);
      resMonitor = new ResMon(context, 'che-namespace');
      jest.useFakeTimers();
      await resMonitor.requestMetricsServer();
      jest.runOnlyPendingTimers();
      expect(setInterval).toHaveBeenLastCalledWith(expect.any(Function), 5000);
      jest.useRealTimers();
      expect(che.k8s.sendRawQuery).toBeCalledTimes(2);
      expect(che.k8s.sendRawQuery).toHaveBeenLastCalledWith(
        '/apis/metrics.k8s.io/v1beta1/namespaces/che-namespace/pods/workspace',
        {
          url: '/apis/metrics.k8s.io/v1beta1/namespaces/che-namespace/pods',
        }
      );
    });
  });

  describe('getMetrics', () => {
    test('Read metrics information', async () => {
      const podJson = await fs.readFile(path.join(__dirname, '_data', 'podInfo.json'), 'utf8');
      const podInfo: che.K8SRawResponse = {
        data: podJson,
        error: '',
        statusCode: 200,
      };
      const metricsJson = await fs.readFile(path.join(__dirname, '_data', 'podMetrics.json'), 'utf8');
      const metricsInfo: che.K8SRawResponse = {
        data: metricsJson,
        error: '',
        statusCode: 200,
      };

      sendRawQuery.mockReturnValueOnce(podInfo).mockReturnValueOnce(metricsInfo);
      resMonitor = new ResMon(context, 'che-namespace');
      await resMonitor.getContainersInfo();
      const containers = await resMonitor.getMetrics();
      expect(containers.length).toBe(5);
      expect(containers[0]).toEqual({
        name: 'che-jwtproxy7yc7hvrc',
        cpuLimit: 500,
        memoryLimit: 2000000000,
        cpuUsed: 250,
        memoryUsed: 100000000,
      });
      expect(containers[1]).toEqual({
        name: 'maven',
        cpuLimit: 0,
        memoryLimit: 1000000000,
        cpuUsed: 100,
        memoryUsed: 153600000,
      });
      expect(containers[2]).toEqual({
        name: 'vscode-javauil',
        cpuLimit: 0,
        memoryLimit: 200000,
        cpuUsed: 20,
        memoryUsed: 100000,
      });
      expect(containers[3]).toEqual({
        name: 'che-machine-exec122',
        cpuLimit: 5000,
        memoryLimit: 20000,
        cpuUsed: 15,
        memoryUsed: 10,
      });
      expect(containers[4]).toEqual({
        name: 'theia-idewf0',
        cpuLimit: 0,
        memoryLimit: 536870912,
        cpuUsed: 10,
        memoryUsed: 5242880,
      });

      // Check status bar
      expect(statusBarItem.text).toBe('$(ellipsis) Mem: 0.26/3.54 GB 7% $(pulse) CPU: 395 m');
      expect(statusBarItem.color).toBe('#FFFFFF');
      expect(statusBarItem.tooltip).toBe('Workspace resources');
    });

    test('Cannot read metrics', async () => {
      const podJson = await fs.readFile(path.join(__dirname, '_data', 'podInfo.json'), 'utf8');
      const podInfo: che.K8SRawResponse = {
        data: podJson,
        error: '',
        statusCode: 200,
      };
      const metricsInfo: che.K8SRawResponse = {
        data: 'Error from server (Forbidden)',
        error: 'Error from server (Forbidden)',
        statusCode: 403,
      };

      sendRawQuery.mockReturnValueOnce(podInfo).mockReturnValueOnce(metricsInfo);
      resMonitor = new ResMon(context, 'che-namespace');
      await resMonitor.getContainersInfo();
      await resMonitor.getMetrics();

      // Check status bar
      expect(statusBarItem.text).toBe('$(ban) Resources');
      expect(statusBarItem.color).toBe('#FFFFFF');
      expect(statusBarItem.tooltip).toBe('Resources Monitor');
    });

    test('Status bar should be marked as warning with container information', async () => {
      const podJson = await fs.readFile(path.join(__dirname, '_data', 'podInfo.json'), 'utf8');
      const podInfo: che.K8SRawResponse = {
        data: podJson,
        error: '',
        statusCode: 200,
      };
      const metricsJson = await fs.readFile(path.join(__dirname, '_data', 'limitedMemoryMetrics.json'), 'utf8');
      const metricsInfo: che.K8SRawResponse = {
        data: metricsJson,
        error: '',
        statusCode: 200,
      };

      sendRawQuery.mockReturnValueOnce(podInfo).mockReturnValueOnce(metricsInfo);
      resMonitor = new ResMon(context, 'che-namespace');
      await resMonitor.getContainersInfo();
      await resMonitor.getMetrics();

      // Check status bar
      expect(statusBarItem.text).toBe('$(ellipsis) Mem: 950/1000 MB 95% $(pulse) CPU: 100 m');
      expect(statusBarItem.color).toBe('#FFCC00');
      expect(statusBarItem.tooltip).toBe('maven container');
    });
  });

  describe('showDetailedInfo', () => {
    test('Show detailed infot in quick pick window', async () => {
      const podJson = await fs.readFile(path.join(__dirname, '_data', 'podInfo.json'), 'utf8');
      const podInfo: che.K8SRawResponse = {
        data: podJson,
        error: '',
        statusCode: 200,
      };
      const metricsJson = await fs.readFile(path.join(__dirname, '_data', 'podMetrics.json'), 'utf8');
      const metricsInfo: che.K8SRawResponse = {
        data: metricsJson,
        error: '',
        statusCode: 200,
      };

      sendRawQuery.mockReturnValueOnce(podInfo).mockReturnValueOnce(metricsInfo);
      resMonitor = new ResMon(context, 'che-namespace');
      await resMonitor.getContainersInfo();
      await resMonitor.getMetrics();

      resMonitor.showDetailedInfo();

      const item1: theia.QuickPickItem = {
        label: 'che-jwtproxy7yc7hvrc',
        detail: 'Mem (MB): 100 (Used) / 2000 (Limited) | CPU : 250m (Used) / 500m (Limited)',
        showBorder: true,
      };
      const item2: theia.QuickPickItem = {
        label: 'maven',
        detail: 'Mem (MB): 153 (Used) / 1000 (Limited) | CPU : 100m (Used) / not set (Limited)',
        showBorder: true,
      };
      const item3: theia.QuickPickItem = {
        label: 'vscode-javauil',
        detail: 'Mem (MB): 0 (Used) / 0 (Limited) | CPU : 20m (Used) / not set (Limited)',
        showBorder: true,
      };
      const item4: theia.QuickPickItem = {
        label: 'che-machine-exec122',
        detail: 'Mem (MB): 0 (Used) / 0 (Limited) | CPU : 15m (Used) / 5000m (Limited)',
        showBorder: true,
      };
      const item5: theia.QuickPickItem = {
        label: 'theia-idewf0',
        detail: 'Mem (MB): 5 (Used) / 536 (Limited) | CPU : 10m (Used) / not set (Limited)',
        showBorder: true,
      };
      expect(theia.window.showQuickPick).toHaveBeenCalledWith([item1, item2, item3, item4, item5], {});
    });
  });
  describe('start', () => {
    test('Resource Monitor initialization', async () => {
      const response: che.K8SRawResponse = {
        data: 'internal server error',
        error: 'internal server error',
        statusCode: 500,
      };
      sendRawQuery.mockReturnValue(response);
      await resourceMonitorPlugin.start(context);

      expect(theia.commands.registerCommand).toHaveBeenCalledWith(expect.any(Object), expect.any(Function));
      expect(theia.window.createStatusBarItem).toHaveBeenCalledWith(1);
      expect(statusBarItem.alignment).toBe(1);
      expect(statusBarItem.color).toBe('#FFFFFF');
      expect(statusBarItem.show).toHaveBeenCalledTimes(1);
      expect(statusBarItem.command).toBe(SHOW_WARNING_MESSAGE_COMMAND.id);
    });
  });

  describe('showWarningMessage', () => {
    test('Show warning notification with a message', async () => {
      resMonitor = new ResMon(context, 'che-namespace');

      resMonitor.showWarningMessage();

      expect(theia.window.showWarningMessage).toBeCalledWith(expect.any(String));
    });
  });
});
