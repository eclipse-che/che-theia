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
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */

import 'reflect-metadata';

import * as fs from 'fs-extra';
import * as jsYaml from 'js-yaml';
import * as path from 'path';

import {
  DevfileComponentEndpoint,
  DevfileComponentEnv,
} from '@eclipse-che/theia-remote-api/lib/common/devfile-service';

import { CheServerDevfileServiceImpl } from '../../src/node/che-server-devfile-service-impl';
import { Container } from 'inversify';
import { WorkspaceService } from '@eclipse-che/theia-remote-api/lib/common/workspace-service';
import { che } from '@eclipse-che/api';

describe.only('Test CheServerDevfileServiceImpl', () => {
  let container: Container;

  let cheServerDevfileServiceImpl: CheServerDevfileServiceImpl;

  const workspaceServiceCurrentWorkspaceMethod = jest.fn();
  const workspaceService = {
    currentWorkspace: workspaceServiceCurrentWorkspaceMethod,
  } as any;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    container = new Container();

    container.bind(CheServerDevfileServiceImpl).toSelf().inSingletonScope();
    container.bind(WorkspaceService).toConstantValue(workspaceService);
    cheServerDevfileServiceImpl = container.get(CheServerDevfileServiceImpl);
  });

  test('get', async () => {
    const workspaceJsonPath = path.resolve(__dirname, '..', '_data', 'workspace-runtime.json');
    const workspaceJsonContent = await fs.readFile(workspaceJsonPath, 'utf-8');
    const workspaceJson = JSON.parse(workspaceJsonContent);
    workspaceServiceCurrentWorkspaceMethod.mockResolvedValue(workspaceJson);

    const devfile = await cheServerDevfileServiceImpl.get();
    expect(devfile).toBeDefined();

    // check projects
    expect(devfile.projects?.length).toBe(1);
    const devfileProject = devfile.projects![0];
    expect(devfileProject.name).toBe('console-java-simple');
    expect(devfileProject.git).toStrictEqual({
      checkoutFrom: { revision: 'java1.11' },
      remotes: { origin: 'https://github.com/che-samples/console-java-simple.git' },
    });

    // check attributes
    expect(devfile.metadata).toBeDefined();
    const devfileMetadata = devfile.metadata || {};
    expect(devfileMetadata.attributes).toBeDefined();
    const devfileAttributes = devfileMetadata.attributes || {};
    expect(devfileAttributes.persistVolumes).toBe('false');

    // check components
    expect(devfile.components?.length).toBe(2);

    const cheRedhatComponent = devfile.components?.find(
      component => component.plugin !== undefined && component.plugin.id === 'redhat/java/latest'
    );
    expect(cheRedhatComponent).toBeDefined();
    expect(cheRedhatComponent!.plugin).toBeDefined();
    const cheRedhatPlugin = cheRedhatComponent!.plugin!;
    expect(cheRedhatPlugin.id).toBe('redhat/java/latest');

    const mavenComponent = devfile.components?.find(component => component.name === 'maven');
    expect(mavenComponent).toBeDefined();
    const mavenContainer: any = mavenComponent!.container! || {};
    expect(mavenContainer.image).toBe('quay.io/eclipse/che-java11-maven:nightly');
    expect(mavenContainer.memoryLimit).toBe('512Mi');
    expect(mavenContainer.mountSources).toBeTruthy();
    expect(mavenContainer.volumeMounts).toStrictEqual([
      {
        name: 'm2',
        path: '/home/user/.m2',
      },
    ]);

    expect(mavenContainer.endpoints).toBeDefined();
    const mavenContainerEndpoints: DevfileComponentEndpoint[] = mavenContainer.endpoints || [];
    expect(mavenContainerEndpoints.length).toBe(1);
    const debugEndPoint: DevfileComponentEndpoint = mavenContainerEndpoints[0];
    expect(debugEndPoint.name).toBe('debug');
    expect(debugEndPoint.targetPort).toBe(5005);
    expect(debugEndPoint.exposure).toBe('internal');
    expect(debugEndPoint.attributes).toBeDefined();
    const debugEndpointAttributes = debugEndPoint.attributes || {};
    expect(debugEndpointAttributes['public']).toBe('false');

    expect(mavenContainer.env).toBeDefined();
    const mavenContainerEnv: DevfileComponentEnv[] = mavenContainer.env || [];
    expect(mavenContainerEnv.length).toBe(4);
    const javaOptsEnv: any = mavenContainerEnv.find(env => env.name === 'JAVA_OPTS') || {};
    expect(javaOptsEnv.value).toMatch('-XX:MaxRAMPercentage\u003d50 -XX:+UseParallelGC');
  });

  test('convert v1/v2', async () => {
    // convert devfile1 to devfile2 to devfile1 and see if it's the same object

    const devfileV1: che.workspace.devfile.Devfile = {
      apiVersion: '1.0.0',
      metadata: {
        generateName: 'hello',
      },

      projects: [
        {
          name: 'my-project',

          source: {
            type: 'git',
            location: 'https://github.com/this-is-a-test',
            branch: 'myBranch',
          },
        },
      ],
    };
    const convertedToDevfileV2 = cheServerDevfileServiceImpl.devfileV1toDevfileV2(devfileV1);
    const convertedToDevfileV1 = cheServerDevfileServiceImpl.devfileV2toDevfileV1(convertedToDevfileV2);
    expect(convertedToDevfileV1).toEqual(devfileV1);
  });

  test('convert v1/v2 che-theia devfile.yaml', async () => {
    const cheTheiaDevfileYamlPath = path.resolve(__dirname, '..', '_data', 'che-theia-devfile-developers-v1.yaml');
    const devfileContent = await fs.readFile(cheTheiaDevfileYamlPath, 'utf-8');
    const devfileV1 = jsYaml.safeLoad(devfileContent);

    const convertedDevfileV2 = cheServerDevfileServiceImpl.devfileV1toDevfileV2(devfileV1);
    const convertedDevfileV1 = cheServerDevfileServiceImpl.devfileV2toDevfileV1(convertedDevfileV2);
    expect(convertedDevfileV1).toEqual(devfileV1);
  });

  test('convert v1/v2 go devfile.yaml', async () => {
    const cheTheiaDevfileYamlPath = path.resolve(__dirname, '..', '_data', 'devfile-go-v1.yaml');
    const devfileContent = await fs.readFile(cheTheiaDevfileYamlPath, 'utf-8');
    const devfileV1 = jsYaml.safeLoad(devfileContent);

    const convertedDevfileV2 = cheServerDevfileServiceImpl.devfileV1toDevfileV2(devfileV1);
    const convertedDevfileV1 = cheServerDevfileServiceImpl.devfileV2toDevfileV1(convertedDevfileV2);
    expect(convertedDevfileV1).toEqual(devfileV1);
  });

  test('convert v1/v2 java-maven devfile.yaml', async () => {
    const cheTheiaDevfileYamlPath = path.resolve(__dirname, '..', '_data', 'devfile-java-maven-v1.yaml');
    const devfileContent = await fs.readFile(cheTheiaDevfileYamlPath, 'utf-8');
    const devfileV1 = jsYaml.safeLoad(devfileContent);

    const convertedDevfileV2 = cheServerDevfileServiceImpl.devfileV1toDevfileV2(devfileV1);
    const convertedDevfileV1 = cheServerDevfileServiceImpl.devfileV2toDevfileV1(convertedDevfileV2);
    expect(convertedDevfileV1).toEqual(devfileV1);
  });

  test('convert v1/v2 devfile-dummv1.yaml', async () => {
    const cheTheiaDevfileYamlPath = path.resolve(__dirname, '..', '_data', 'devfile-dummy-v1.yaml');
    const devfileContent = await fs.readFile(cheTheiaDevfileYamlPath, 'utf-8');
    const devfileV1 = jsYaml.safeLoad(devfileContent);

    const convertedDevfileV2 = cheServerDevfileServiceImpl.devfileV1toDevfileV2(devfileV1);
    const convertedDevfileV1 = cheServerDevfileServiceImpl.devfileV2toDevfileV1(convertedDevfileV2);
    expect(convertedDevfileV1).toEqual(devfileV1);
  });
});
