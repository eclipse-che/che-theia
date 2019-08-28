/*********************************************************************
* Copyright (c) 2019 Red Hat, Inc.
*
* This program and the accompanying materials are made
* available under the terms of the Eclipse Public License 2.0
* which is available at https://www.eclipse.org/legal/epl-2.0/
*
* SPDX-License-Identifier: EPL-2.0
**********************************************************************/

import { PortScanner, AbstractInternalScanner } from './port-scanner';
import { Port } from './port';

interface PortCallback {
    (port: Port): void;
}

/**
 * Check if there are new ports being opened or closed and send events callbacks
 * @author Florent Benoit
 */
export class PortChangesDetector {

    private static readonly WAIT = 3000;
    private openedPorts: Port[] = [];

    private readonly portScanner: PortScanner;

    private onDidOpenPorts: ((openPort: Port) => void)[] = [];
    private onDidClosePorts: ((closedPort: Port) => void)[] = [];

    public onDidOpenPort(callback: PortCallback): void {
        this.onDidOpenPorts.push(callback);
    }

    public onDidClosePort(callback: PortCallback): void {
        this.onDidClosePorts.push(callback);
    }

    constructor(internalScanner?: AbstractInternalScanner) {
        this.portScanner = new PortScanner(internalScanner);
    }

    /**
     * Get opened ports.
     */
    public async init(): Promise<void> {
        this.openedPorts = await this.portScanner.getListeningPorts();
    }

    public async monitor(): Promise<void> {
        // grab new port opened and compare
        const scanPorts = await this.portScanner.getListeningPorts();

        // not yet opened ?
        const newOpened = scanPorts.filter(port => !this.openedPorts.some(openPort => openPort.portNumber === port.portNumber));

        // new closed
        const closed = this.openedPorts.filter(port => !scanPorts.some(openPort => openPort.portNumber === port.portNumber));

        // send events
        this.onDidOpenPorts.map(func => {
            newOpened.map(port => func(port));
        });

        this.onDidClosePorts.map(func => {
            closed.map(port => func(port));
        });

        this.openedPorts = scanPorts;

    }

    public async check(): Promise<void> {

        // monitor
        await this.monitor();

        // start again check
        setTimeout(() => this.check(), PortChangesDetector.WAIT);
    }
}
