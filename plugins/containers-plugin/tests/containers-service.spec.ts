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

import * as che from '@eclipse-che/plugin';
import * as fs from 'fs-extra';
import * as path from 'path';

import { ContainersService } from '../src/containers-service';

describe('Test containers service', () => {
  let containersService: ContainersService;
  const devfileGetSpy = jest.spyOn(che.devfile, 'get');
  const devfileGetComponentStatusesSpy = jest.spyOn(che.devfile, 'getComponentStatuses');

  beforeEach(() => {
    jest.resetAllMocks();
    containersService = new ContainersService();
  });

  test('Check get containers', async () => {
    const devfileGetRawJson = await fs.readFile(path.join(__dirname, '_data', 'devfile-get.json'), 'utf8');
    const devfileGetComponentStatusesRawJson = await fs.readFile(
      path.join(__dirname, '_data', 'devfile-component-statuses.json'),
      'utf8'
    );
    devfileGetSpy.mockReturnValue(JSON.parse(devfileGetRawJson));
    devfileGetComponentStatusesSpy.mockReturnValue(JSON.parse(devfileGetComponentStatusesRawJson));

    await containersService.updateContainers();
    const containers = containersService.containers;
    expect(containers).toBeDefined();
    expect(containers.length).toBe(8);
    // check tools component is there
    const tools: any = containers.find(container => container.name === 'tools') || {};
    expect(tools).toBeDefined();
    expect(tools?.isDev).toBeTruthy();
    const toolsEndpointUrl = tools.endpoints['8080-tcp'].url;
    expect(toolsEndpointUrl).toBe('https://serverq9v89umy-tools-server-8080.192.168.64.33.nip.io/');
    expect(tools.env.length).toBe(3);
    expect(tools.env[2].name).toBe('MAVEN_OPTS');
    expect(tools.env[2].value).toBe('$(JAVA_OPTS)');
    expect(tools.volumeMounts).toStrictEqual([
      {
        name: 'm2',
        path: '/home/user/.m2',
      },
    ]);
    expect(tools.commands?.length).toBe(2);
    expect(tools.commands[0].commandName).toBe('maven build');
    expect(tools.commands[0].commandLine).toBe('mvn clean install');

    // check theia component is there
    const theiaIdeContainer: any = containers.find(container => container.name === 'theia-ide7e5');
    expect(theiaIdeContainer).toBeDefined();
    expect(theiaIdeContainer?.isDev).toBeFalsy();
    const theiaEndpointUrl = theiaIdeContainer.endpoints['theia'].url;
    expect(theiaEndpointUrl).toBe('https://192.168.64.33.nip.io/serverfrlrgyw4-jwtproxy/server-4403/');
  });
});
