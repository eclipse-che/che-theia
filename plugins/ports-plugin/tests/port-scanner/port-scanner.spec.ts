/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { AbstractInternalScanner, PortScanner } from '../../src/port-scanner';

class DummyInternalScanner extends AbstractInternalScanner {
  async getListeningPortV4() {
    return super.readFilePromise(__dirname + '/port-scanner-listen-ipv4.stdout');
  }
  async getListeningPortV6() {
    return super.readFilePromise(__dirname + '/port-scanner-listen-ipv6.stdout');
  }
}

describe('Test Port Scanner with dummy data', () => {
  let portScanner: PortScanner;

  beforeEach(() => {
    portScanner = new PortScanner(new DummyInternalScanner());
  });

  test('test port opened', async () => {
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

describe('Test Port Scanner with real path', () => {
  let portScanner: PortScanner;

  beforeEach(() => {
    portScanner = new PortScanner();
  });

  test('test no unhandled exception is thrown', async () => {
    await portScanner.getListeningPorts();
    await portScanner.getListeningPorts();
  });
});
