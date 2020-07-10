/*********************************************************************
* Copyright (c) 2019 Red Hat, Inc.
*
* This program and the accompanying materials are made
* available under the terms of the Eclipse Public License 2.0
* which is available at https://www.eclipse.org/legal/epl-2.0/
*
* SPDX-License-Identifier: EPL-2.0
**********************************************************************/

/**
 * Convert ip from /proc/net/tcp or /proc/net/tcp6
 * Can be at ipv4 or ipv6 format
 * @author Florent Benoit
 */
export class IpConverter {

    removeExtraColon(entry: string): string {
        if (entry.indexOf(':::') !== -1) {
            return this.removeExtraColon(entry.replace(':::', '::'));
        }

        return entry.toLocaleLowerCase();
    }

    clean(entry: string): string {
        if (entry.startsWith('0')) {
            return this.clean(entry.substring(1));
        }

        return entry.toLocaleLowerCase();
    }

    convert(entry: string): string {
        const networkInterfaceRegexpV4 = /([0-9a-fA-F][0-9a-fA-F])([0-9a-fA-F][0-9a-fA-F])([0-9a-fA-F][0-9a-fA-F])([0-9a-fA-F][0-9a-fA-F])/gm;
        // eslint-disable-next-line max-len
        const networkInterfaceRegexpV6 = /([0-9a-fA-F][0-9a-fA-F])([0-9a-fA-F][0-9a-fA-F])([0-9a-fA-F][0-9a-fA-F])([0-9a-fA-F][0-9a-fA-F])([0-9a-fA-F][0-9a-fA-F])([0-9a-fA-F][0-9a-fA-F])([0-9a-fA-F][0-9a-fA-F])([0-9a-fA-F][0-9a-fA-F])([0-9a-fA-F][0-9a-fA-F])([0-9a-fA-F][0-9a-fA-F])([0-9a-fA-F][0-9a-fA-F])([0-9a-fA-F][0-9a-fA-F])([0-9a-fA-F][0-9a-fA-F])([0-9a-fA-F][0-9a-fA-F])([0-9a-fA-F][0-9a-fA-F])([0-9a-fA-F][0-9a-fA-F])/gm;
        let interfaceListen;
        if (entry.length === 8) {
            const netMatcher = networkInterfaceRegexpV4.exec(entry);
            interfaceListen = `${parseInt(netMatcher![4], 16)}.${parseInt(netMatcher![3], 16)}.${parseInt(netMatcher![2], 16)}.${parseInt(netMatcher![1], 16)}`;
        } else {
            const netMatcher = networkInterfaceRegexpV6.exec(entry);
            // eslint-disable-next-line max-len
            interfaceListen = this.removeExtraColon(`${this.clean(netMatcher![4] + netMatcher![3])}:${this.clean(netMatcher![2] + netMatcher![1])}:${this.clean(netMatcher![8] + netMatcher![7])}:${this.clean(netMatcher![6] + netMatcher![5])}:${this.clean(netMatcher![12] + netMatcher![11])}:${this.clean(netMatcher![10] + netMatcher![9])}:${this.clean(netMatcher![16] + netMatcher![15])}:${this.clean(netMatcher![14] + netMatcher![13])}`);
        }

        return interfaceListen;

    }

}
