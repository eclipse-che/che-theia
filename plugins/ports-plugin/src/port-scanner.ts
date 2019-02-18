/*********************************************************************
* Copyright (c) 2019 Red Hat, Inc.
*
* This program and the accompanying materials are made
* available under the terms of the Eclipse Public License 2.0
* which is available at https://www.eclipse.org/legal/epl-2.0/
*
* SPDX-License-Identifier: EPL-2.0
**********************************************************************/

import { Port } from './port';
import { Command } from './command';
import { IpConverter } from './ip-converter';

/**
 * Allow to grab ports being opened and on which network interface
 * @author Florent Benoit
 */
export class PortScanner {

    public static readonly GRAB_PORTS_IPV4 = 'cat /proc/net/tcp';
    public static readonly GRAB_PORTS_IPV6 = 'cat /proc/net/tcp6';

    /**
     * Get opened ports.
     */
    public async getListeningPorts(): Promise<Port[]> {

        const ipConverter = new IpConverter();
        // connect to /proc/net/tcp and /proc/net/tcp6
        const command = new Command(__dirname);
        const outputv4 = await command.exec(PortScanner.GRAB_PORTS_IPV4);
        const outputv6 = await command.exec(PortScanner.GRAB_PORTS_IPV6);

        // assembe ipv4 and ipv6 output
        const output = `
        ${outputv4}
        ${outputv6}
        `;

        // parse
        const regex = /:\s(.*):(.*)\s[0-9].*\s0A\s/gm;
        const ports = [];
        let matcher;
        while ((matcher = regex.exec(output)) !== null) {
            const ipRaw = matcher[1];
            const portRaw = matcher[2];
            const interfaceListen = ipConverter.convert(ipRaw);
            // convert port which is in HEX to int
            const portNumber = parseInt(portRaw, 16);
            const port: Port = { portNumber, interfaceListen };
            ports.push(port);
        }
        return ports;
    }
}
