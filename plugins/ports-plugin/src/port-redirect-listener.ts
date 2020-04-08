/*********************************************************************
* Copyright (c) 2019 Red Hat, Inc.
*
* This program and the accompanying materials are made
* available under the terms of the Eclipse Public License 2.0
* which is available at https://www.eclipse.org/legal/epl-2.0/
*
* SPDX-License-Identifier: EPL-2.0
**********************************************************************/

import * as net from 'net';

/**
 * Allow to Listen on a port and redirect traffic.
 * @author Florent Benoit
 */
export class PortRedirectListener {

    private server: net.Server;

    constructor(private readonly localPort: number, private readonly remoteHost: string, private readonly remotePort: number) {

    }

    async start(): Promise<void> {

        this.server = net.createServer(localsocket => {
            const remotesocket = new net.Socket();

            remotesocket.connect(this.remotePort, this.remoteHost);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            localsocket.on('connect', (data: any) => {
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            localsocket.on('data', (data: any) => {
                remotesocket.write(data);
            });

            remotesocket.on('data', data => {
                const flushed = localsocket.write(data);
                if (!flushed) {
                    remotesocket.pause();
                }
            });

            localsocket.on('drain', () => {
                remotesocket.resume();
            });

            remotesocket.on('drain', () => {
                localsocket.resume();
            });

            localsocket.on('close', had_error => {
                remotesocket.end();
            });

            remotesocket.on('close', had_error => {
                localsocket.end();
            });

        });

        this.server.listen(this.localPort);

        console.info('redirecting connections from 127.0.0.1:%d to %s:%d', this.localPort, this.remoteHost, this.remotePort);
    }

    stop(): void {
        this.server.close();
    }
}
