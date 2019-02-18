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
import { PortScanner } from "../../src/port-scanner";
import { PortChangesDetector } from "../../src/port-changes-detector";
import { Command } from "../../src/command";
import { Port } from "../../src/port";

jest.mock("../../src/command");

describe("Test Port Changes", () => {

    let portChangesDetector: PortChangesDetector;

    beforeEach(() => {
        portChangesDetector = new PortChangesDetector();
    });

    test("test events triggered", async () => {
        const outputBefore = fs.readFileSync(__dirname + "/port-changes-detector-before.stdout");
        (Command as any).__setExecCommandOutput(PortScanner.GRAB_PORTS_IPV4, outputBefore);

        // register callbacks
        const newOpenedPorts: Port[] = [];
        const newClosedPorts: Port[] = [];

        portChangesDetector.onDidOpenPort(port => newOpenedPorts.push(port));
        portChangesDetector.onDidClosePort(port => newClosedPorts.push(port));

        // init
        await portChangesDetector.init();

        // change  output
        const outputAfter = fs.readFileSync(__dirname + "/port-changes-detector-after.stdout");
        (Command as any).__setExecCommandOutput(PortScanner.GRAB_PORTS_IPV4, outputAfter);

        // monitor
        await portChangesDetector.check();

        // check we have callbacks called for new open port and for new closed port
        expect(newOpenedPorts.length).toBe(1);
        expect(newClosedPorts.length).toBe(1);
        expect(newOpenedPorts[0].interfaceListen).toBe('127.0.0.1');
        expect(newOpenedPorts[0].portNumber).toBe(25);

        expect(newClosedPorts[0].interfaceListen).toBe('0.0.0.0');
        expect(newClosedPorts[0].portNumber).toBe(5555);

    });

});
