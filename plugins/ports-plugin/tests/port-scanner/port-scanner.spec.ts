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
import { Command } from "../../src/command";

jest.mock("../../src/command");

describe("Test Port Scanner", () => {

    let portScanner: PortScanner;

    beforeEach(() => {
        portScanner = new PortScanner();
    });

    test("test port opened", async () => {
        const outputIpv4 = fs.readFileSync(__dirname + "/port-scanner-listen-ipv4.stdout");
        const outputIpv6 = fs.readFileSync(__dirname + "/port-scanner-listen-ipv6.stdout");
        (Command as any).__setExecCommandOutput(PortScanner.GRAB_PORTS_IPV4, outputIpv4);
        (Command as any).__setExecCommandOutput(PortScanner.GRAB_PORTS_IPV6, outputIpv6);
        const ports = await portScanner.getListeningPorts();
        expect(ports).toBeDefined();
        expect(Array.isArray(ports)).toBe(true);
        expect(ports.length).toBe(5);
        expect(ports[0].interfaceListen).toBe('0.0.0.0');
        expect(ports[0].portNumber).toBe(25);
        expect(ports[1].interfaceListen).toBe('127.0.0.1');
        expect(ports[1].portNumber).toBe(26);
        expect(ports[2].interfaceListen).toBe('0.0.0.0');
        expect(ports[2].portNumber).toBe(5555);
        expect(ports[3].interfaceListen).toBe('::1');
        expect(ports[3].portNumber).toBe(1236);
        expect(ports[4].interfaceListen).toBe('::');
        expect(ports[4].portNumber).toBe(4444);
    });

});
