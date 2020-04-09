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
import { IpConverter } from './ip-converter';
import { readFile } from 'fs';

/**
 * Injectrable internal scanner used with PortScanner.
 * @author Masaki Muranaka <monaka@monami-ya.com>
 */
export abstract class AbstractInternalScanner {
    public readFilePromise(path: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            readFile(path, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data.toString());
                }
            });
        });
    }
    abstract getListeningPortV4(): Promise<string>;
    abstract getListeningPortV6(): Promise<string>;

}

/**
 * Default internal scanner used with PortScanner.
 * @author Masaki Muranaka <monaka@monami-ya.com>
 */
class DefaultInternalScanner extends AbstractInternalScanner {
    public static readonly PORTS_IPV4 = '/proc/net/tcp';
    public static readonly PORTS_IPV6 = '/proc/net/tcp6';
    private fetchIPV4 = true;
    private fetchIPV6 = true;

    async getListeningPortV4(): Promise<string> {
        return this.fetchIPV4 ? this.readFilePromise(DefaultInternalScanner.PORTS_IPV4)
            .catch(e => {
                console.error(e);
                this.fetchIPV4 = false;
                return Promise.resolve('');
            }) : '';
    }

    async getListeningPortV6(): Promise<string> {
        return this.fetchIPV6 ? this.readFilePromise(DefaultInternalScanner.PORTS_IPV6)
            .catch(e => {
                console.error(e);
                this.fetchIPV6 = false;
                return Promise.resolve('');
            }) : '';
    }
}

/**
 * Allow to grab ports being opened and on which network interface
 * @author Florent Benoit
 */
export class PortScanner {
    private scanner: AbstractInternalScanner;

    /* `scanner` will be injected on tests. */
    constructor(scanner: AbstractInternalScanner = new DefaultInternalScanner()) {
        this.scanner = scanner;
    }

    /**
     * Get opened ports.
     */
    public async getListeningPorts(): Promise<Port[]> {

        const ipConverter = new IpConverter();
        const outIPV6 = this.scanner.getListeningPortV6();
        const outIPV4 = this.scanner.getListeningPortV4();
        const output = (await Promise.all([outIPV4, outIPV6])).join();

        // parse
        const regex = /:\s(.*):(.*)\s[0-9].*\s0A\s/gm;
        const ports = [];
        let matcher;
        // eslint-disable-next-line no-null/no-null
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
