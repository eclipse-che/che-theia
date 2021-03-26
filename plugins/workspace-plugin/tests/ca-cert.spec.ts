/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { Stats } from 'fs';

describe('Test preparing of CA bundle: ', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.resetModules();
  });

  test('With no certificates', async () => {
    jest.mock('fs-extra', () => ({
      pathExists: async (path: string): Promise<boolean> => false,
    }));

    const fse = require('fs-extra');
    const pathExistsSpy = jest.spyOn(fse, 'pathExists');

    const cert = require('../src/ca-cert');

    const bundle = await cert.getCertificate;
    expect(bundle).toBe(undefined);

    expect(pathExistsSpy).toHaveBeenCalledTimes(6);
  });

  test('With one first default certificate', async () => {
    let testContent = '';

    jest.mock('fs-extra', () => ({
      pathExists: async (path: string): Promise<boolean> => {
        if (path === '/etc/ssl/certs/ca-certificates.crt') {
          return true;
        }

        return false;
      },

      readFile: async (file: string | Buffer | number): Promise<Buffer> => {
        if (file === '/etc/ssl/certs/ca-certificates.crt') {
          return Buffer.from('/etc/ssl/certs/ca-certificates.crt', 'utf-8');
        }

        return Promise.reject();
      },

      appendFile: async (path: string, data: string | Buffer): Promise<void> => {
        testContent += data;
      },
    }));

    const fse = require('fs-extra');
    const pathExistsSpy = jest.spyOn(fse, 'pathExists');
    const readFileSpy = jest.spyOn(fse, 'readFile');
    const appendFileSpy = jest.spyOn(fse, 'appendFile');

    const cert = require('../src/ca-cert');

    const bundle = await cert.getCertificate;
    expect(bundle).toBe('/tmp/ca-bundle.crt');

    expect(pathExistsSpy).toHaveBeenCalledTimes(3);
    expect(readFileSpy).toHaveBeenCalledTimes(1);
    expect(appendFileSpy).toHaveBeenCalledTimes(1);

    expect(testContent).toBe('/etc/ssl/certs/ca-certificates.crt');
  });

  test('With the last default certificate and with /tmp/che/secret/ca.crt', async () => {
    let testContent = '';

    jest.mock('fs-extra', () => ({
      pathExists: async (path: string): Promise<boolean> => {
        if (path === '/etc/ssl/cert.pem' || path === '/tmp/che/secret/ca.crt') {
          return true;
        }

        return false;
      },

      readFile: async (file: string | Buffer | number): Promise<Buffer> => {
        if (file === '/etc/ssl/cert.pem') {
          return Buffer.from('/etc/ssl/cert.pem', 'utf-8');
        } else if (file === '/tmp/che/secret/ca.crt') {
          return Buffer.from('/tmp/che/secret/ca.crt', 'utf-8');
        }

        return Promise.reject();
      },

      appendFile: async (path: string, data: string | Buffer): Promise<void> => {
        testContent += data;
      },
    }));

    const fse = require('fs-extra');
    const pathExistsSpy = jest.spyOn(fse, 'pathExists');
    const readFileSpy = jest.spyOn(fse, 'readFile');
    const appendFileSpy = jest.spyOn(fse, 'appendFile');

    const cert = require('../src/ca-cert');

    const bundle = await cert.getCertificate;
    expect(bundle).toBe('/tmp/ca-bundle.crt');

    expect(pathExistsSpy).toHaveBeenCalledTimes(6);
    expect(readFileSpy).toHaveBeenCalledTimes(2);
    expect(appendFileSpy).toHaveBeenCalledTimes(2);

    expect(testContent).toBe('/etc/ssl/cert.pem' + '/tmp/che/secret/ca.crt');
  });

  /**
   * Includes:
   *    - third certificate /etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem ( in SYSTEM_CERTS )
   *    - Che secret /tmp/che/secret/ca.crt
   *    - two certificates in /public-certs
   */
  test('With multiple certificates', async () => {
    let testContent = '';

    jest.mock('fs-extra', () => ({
      pathExists: async (path: string): Promise<boolean> => {
        if (
          path === '/etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem' ||
          path === '/tmp/che/secret/ca.crt' ||
          path === '/public-certs' ||
          path === '/public-certs/cert1.crt' ||
          path === '/public-certs/cert2.pem'
        ) {
          return true;
        }

        return false;
      },

      readFile: async (file: string | Buffer | number): Promise<Buffer> => {
        if (file === '/etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem') {
          return Buffer.from('/etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem', 'utf-8');
        } else if (file === '/tmp/che/secret/ca.crt') {
          return Buffer.from('/tmp/che/secret/ca.crt', 'utf-8');
        } else if (file === '/public-certs/cert1.crt') {
          return Buffer.from('/public-certs/cert1.crt', 'utf-8');
        } else if (file === '/public-certs/cert2.pem') {
          return Buffer.from('/public-certs/cert2.pem', 'utf-8');
        }

        return Promise.reject();
      },

      readdir: async (path: string): Promise<string[]> => {
        if (path === '/public-certs') {
          return ['cert1.crt', 'cert2.pem'];
        }

        return [];
      },

      stat: async (path: string | Buffer): Promise<Stats> =>
        ({
          isFile: () => true,
        } as Stats),

      appendFile: async (path: string, data: string | Buffer): Promise<void> => {
        testContent += data;
      },
    }));

    const fse = require('fs-extra');
    const pathExistsSpy = jest.spyOn(fse, 'pathExists');
    const readFileSpy = jest.spyOn(fse, 'readFile');
    const readdirSpy = jest.spyOn(fse, 'readdir');
    const statSpy = jest.spyOn(fse, 'stat');
    const appendFileSpy = jest.spyOn(fse, 'appendFile');

    const cert = require('../src/ca-cert');

    const bundle = await cert.getCertificate;
    expect(bundle).toBe('/tmp/ca-bundle.crt');

    expect(pathExistsSpy).toHaveBeenCalledTimes(7);
    expect(readFileSpy).toHaveBeenCalledTimes(4);
    expect(readdirSpy).toHaveBeenCalledTimes(1);
    expect(statSpy).toHaveBeenCalledTimes(2);
    expect(appendFileSpy).toHaveBeenCalledTimes(4);

    expect(testContent).toBe(
      '/etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem' +
        '/tmp/che/secret/ca.crt' +
        '/public-certs/cert1.crt' +
        '/public-certs/cert2.pem'
    );
  });
});
