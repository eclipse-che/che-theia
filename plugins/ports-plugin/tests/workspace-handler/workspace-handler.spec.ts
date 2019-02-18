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
import { WorkspaceHandler } from '../../src/workspace-handler';

import * as che from '@eclipse-che/plugin';

describe("Test Workspace Ports", () => {

    let workspaceHandler: WorkspaceHandler;

    beforeEach(() => {
        workspaceHandler = new WorkspaceHandler();
    });

    test("test fail workspace", async () => {

        const ports = await workspaceHandler.getWorkspacePorts();
        expect(ports).toBeDefined();
        expect(Array.isArray(ports)).toBe(true);
        expect(ports.length).toBe(0);

    });

    test("test ports opened", async () => {

        const output = fs.readFileSync(__dirname + "/workspace-output.stdout");

        (che as any).setWorkspaceOutput(output);

        const ports = await workspaceHandler.getWorkspacePorts();

        expect(ports).toBeDefined();
        expect(Array.isArray(ports)).toBe(true);
        expect(ports.length).toBe(1);

        expect(ports[0].portNumber).toBe('3000');
        expect(ports[0].url).toBe('https://routehkw7m74z.openshiftapps.com');
        expect(ports[0].serverName).toBe('florentjs');

    });

});
