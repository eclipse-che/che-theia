/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { AbstractInternalScanner } from "../../src/port-scanner";
import { PortChangesDetector } from "../../src/port-changes-detector";
import { Port } from "../../src/port";

class DummyInternalScanner extends AbstractInternalScanner {
    private path_: string;

    set path(path_: string) {
        this.path_ = path_;
    }

    async getListeningPortV4() {
         return super.readFilePromise(this.path_);
    }
    async getListeningPortV6() {
         return super.readFilePromise("/dev/null");
    }
}

describe("Test Port Changes", () => {
    let dummyInternalScanner = new DummyInternalScanner();
    let portChangesDetector: PortChangesDetector;

    beforeEach(() => {
        portChangesDetector = new PortChangesDetector(dummyInternalScanner);
    });

    test("test events triggered", async () => {
        dummyInternalScanner.path = __dirname + "/port-changes-detector-before.stdout";

        // register callbacks
        const newOpenedPorts: Port[] = [];
        const newClosedPorts: Port[] = [];

        portChangesDetector.onDidOpenPort(port => newOpenedPorts.push(port));
        portChangesDetector.onDidClosePort(port => newClosedPorts.push(port));

        // init
        await portChangesDetector.init();

        // change  output
        dummyInternalScanner.path = __dirname + "/port-changes-detector-after.stdout";

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
