/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/
/* eslint-disable @typescript-eslint/no-explicit-any */

import 'reflect-metadata';

import * as fs from 'fs-extra';
import * as jsYaml from 'js-yaml';
import * as path from 'path';

import { Devfile, DevfileComponent, DevfileProject } from '@eclipse-che/theia-remote-api/lib/common/devfile-service';

import { Container } from 'inversify';
import { K8SServiceImpl } from '../..//src/node/k8s-service-impl';
import { K8sDevWorkspaceEnvVariables } from '../../src/node/k8s-devworkspace-env-variables';
import { K8sDevfileServiceImpl } from '../../src/node/k8s-devfile-service-impl';

describe('Test K8sDevfileServiceImpl', () => {
  let container: Container;

  let k8sDevfileServiceImpl: K8sDevfileServiceImpl;

  const k8sServiceMakeApiClientMethod = jest.fn();
  const k8sServiceMock = {
    makeApiClient: k8sServiceMakeApiClientMethod,
  } as any;
  const customObjectsApiMockGetNamespacedCustomObjectMethod = jest.fn();
  const listNamespacedMockCustomObjectMethod = jest.fn();
  const customObjectsApiMock = {
    getNamespacedCustomObject: customObjectsApiMockGetNamespacedCustomObjectMethod,
    listNamespacedCustomObject: listNamespacedMockCustomObjectMethod,
  };

  const workspaceIdEnvVariablesMethod = jest.fn();
  const workspaceNameEnvVariablesMethod = jest.fn();
  const workspaceNamespaceEnvVariablesMethod = jest.fn();
  const k8sDevWorkspaceEnvVariables = {
    getWorkspaceId: workspaceIdEnvVariablesMethod,
    getWorkspaceName: workspaceNameEnvVariablesMethod,
    getWorkspaceNamespace: workspaceNamespaceEnvVariablesMethod,
  } as any;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    container = new Container();
    container.bind(K8sDevWorkspaceEnvVariables).toConstantValue(k8sDevWorkspaceEnvVariables);
    container.bind(K8sDevfileServiceImpl).toSelf().inSingletonScope();
    container.bind(K8SServiceImpl).toConstantValue(k8sServiceMock);
    k8sServiceMakeApiClientMethod.mockReturnValueOnce(customObjectsApiMock);
    k8sDevfileServiceImpl = container.get(K8sDevfileServiceImpl);
    workspaceNameEnvVariablesMethod.mockReturnValue('fake-workspace-name');
    workspaceNamespaceEnvVariablesMethod.mockReturnValue('fake-workspace-namespace');
  });

  test('get', async () => {
    const devWorkspaceJsonPath = path.resolve(__dirname, '..', '_data', 'get-devworkspace-response-body.json');
    const devWorkspaceJsonContent = await fs.readFile(devWorkspaceJsonPath, 'utf-8');
    const devWorkspaceJson = JSON.parse(devWorkspaceJsonContent);
    workspaceNameEnvVariablesMethod.mockReturnValue('fake-workspace-name');
    workspaceNamespaceEnvVariablesMethod.mockReturnValue('fake-workspace-namespace');
    customObjectsApiMockGetNamespacedCustomObjectMethod.mockReturnValue({ body: devWorkspaceJson });

    const devfile = await k8sDevfileServiceImpl.get();
    expect(devfile).toBeDefined();

    expect(customObjectsApiMockGetNamespacedCustomObjectMethod).toBeCalledWith(
      'workspace.devfile.io',
      'v1alpha2',
      'fake-workspace-namespace',
      'devworkspaces',
      'fake-workspace-name'
    );

    // check projects
    expect(devfile.projects?.length).toBe(1);
    let devfileProject: DevfileProject;
    if (devfile.projects && devfile.projects.length > 0) {
      devfileProject = devfile.projects[0];
    } else {
      fail('Did not found a project in the devfile');
    }
    expect(devfileProject.name).toBe('web-nodejs-sample');
    expect(devfileProject.git).toStrictEqual({
      remotes: { origin: 'https://github.com/che-samples/web-nodejs-sample.git' },
    });

    // check components
    expect(devfile.components?.length).toBe(6);
    let devfileComponent: DevfileComponent;
    if (devfile.components && devfile.components.length > 0) {
      devfileComponent = devfile.components[0];
    } else {
      fail('Did not found a component in the devfile');
    }
    expect(devfileComponent.name).toBe('terminal');
    expect(devfileComponent.container).toBeDefined();
    expect(devfileComponent.container?.image).toBe('quay.io/eclipse/che-machine-exec:nightly');
  });

  test('getRaw', async () => {
    const devWorkspaceJsonPath = path.resolve(__dirname, '..', '_data', 'get-devworkspace-response-body.json');
    const devWorkspaceJsonContent = await fs.readFile(devWorkspaceJsonPath, 'utf-8');
    const devWorkspaceJson = JSON.parse(devWorkspaceJsonContent);

    customObjectsApiMockGetNamespacedCustomObjectMethod.mockReturnValue({ body: devWorkspaceJson });

    const devfileYaml = await k8sDevfileServiceImpl.getRaw();
    expect(devfileYaml).toBeDefined();
    // able to convert result with jsYaml
    const devfileObject = jsYaml.load(devfileYaml) as Devfile;

    // ensure yaml was correct to be converted to be a devfile
    expect(devfileObject.projects?.length).toBe(1);
    expect(devfileObject.components?.length).toBe(6);
  });

  test('getComponentStatus', async () => {
    // mock workspace routing
    const workspaceRoutingJsonPath = path.resolve(
      __dirname,
      '..',
      '_data',
      'get-workspaceroutings-for-a-workspace-id-body.json'
    );
    const workspaceRoutingJsonContent = await fs.readFile(workspaceRoutingJsonPath, 'utf-8');
    const workspaceRoutingJson = JSON.parse(workspaceRoutingJsonContent);

    listNamespacedMockCustomObjectMethod.mockReturnValue({ body: workspaceRoutingJson });

    // mock pod
    const listNamespacedPodMockMethod = jest.fn();
    const coreV1ApiMock = {
      listNamespacedPod: listNamespacedPodMockMethod,
    };
    k8sServiceMakeApiClientMethod.mockReturnValueOnce(coreV1ApiMock);
    const workspacePodJsonPath = path.resolve(__dirname, '..', '_data', 'get-pod-response-body.json');
    const workspacePodJsonContent = await fs.readFile(workspacePodJsonPath, 'utf-8');
    const workspacePodJson = JSON.parse(workspacePodJsonContent);

    listNamespacedPodMockMethod.mockReturnValueOnce({ body: workspacePodJson });

    const componentStatuses = await k8sDevfileServiceImpl.getComponentStatuses();

    expect(componentStatuses.length).toBe(3);

    const theiaComponent = componentStatuses.find(component => component.name === 'theia-ide');
    expect(theiaComponent).toBeDefined();
    const theiaEndpoints = theiaComponent?.endpoints || {};
    expect(theiaEndpoints['theia']?.url).toBe('http://workspaceeb55021d3cff42e0-theia-3100.192.168.64.31.nip.io');
  });
});
