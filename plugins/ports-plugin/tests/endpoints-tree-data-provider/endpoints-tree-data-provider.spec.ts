/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as fs from "fs";
import { CheServerDevfileHandlerImpl } from '../../src/devfile-handler-che-server-impl';
import { DevfileHandler } from '../../src/devfile-handler';
import { EndpointsTreeDataProvider } from '../../src/endpoints-tree-data-provider';
import * as che from '@eclipse-che/plugin';
import { ListeningPort } from "../../src/listening-port";

describe("Test EndpointTree data provider", () => {

    let devfileHandler: DevfileHandler;
    let endpointsTreeDataProvider: EndpointsTreeDataProvider;

    const OLD_ENV = process.env;

    beforeEach(async () => {
        devfileHandler = new CheServerDevfileHandlerImpl();
        jest.resetModules()
        process.env = { ...OLD_ENV };

        // jwt proxy
        process.env.SERVERU2DZ64P8_JWTPROXY_SERVICE_PORT_SERVER_4401='4401';
        process.env.SERVERU2DZ64P8_JWTPROXY_SERVICE_PORT_SERVER_4400='4400';
        process.env.SERVERU2DZ64P8_JWTPROXY_SERVICE_PORT_SERVER_4402='4402';
        process.env.SERVERU2DZ64P8_JWTPROXY_SERVICE_PORT_SERVER_EMPTY='';
        process.env.SERVERU2DZ64P8_JWTPROXY_SERVICE_PORT_SERVER_INVALID='invalid';

        // telemetry
        process.env.CHE_WORKSPACE_TELEMETRY_BACKEND_PORT = '4167';

        });


  afterAll(() => {
    process.env = OLD_ENV;
  });

    test("test endpoint tree data provider", async () => {

        const output = fs.readFileSync(__dirname + "/workspace-output.json");
        (che as any).setWorkspaceOutput(output);

        const listeningPort: ListeningPort[] = [
            { portNumber: 3000, interfaceListen: '0.0.0.0'}
        ];
        const endpoints = await devfileHandler.getEndpoints();
        endpointsTreeDataProvider = new EndpointsTreeDataProvider();
        endpointsTreeDataProvider['showPluginEndpoints'] = true;
        endpointsTreeDataProvider.updateEndpoints(endpoints, listeningPort);

        const children = await endpointsTreeDataProvider.getChildren();

        expect(children).toBeDefined();
        expect(Array.isArray(children)).toBe(true);
        expect(children!.length).toBe(2);

        const firstElement =  endpointsTreeDataProvider.getTreeItem(children![0]);
        expect(firstElement.label).toBe('Public');

        const secondElement =  endpointsTreeDataProvider.getTreeItem(children![1]);
        expect(secondElement.label).toBe('Private');

    });

});
