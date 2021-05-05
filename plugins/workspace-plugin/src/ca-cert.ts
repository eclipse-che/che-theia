/**********************************************************************
 * Copyright (c) 2019-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as fs from 'fs-extra';
import * as path from 'path';

const PUBLIC_CRT_PATH = '/public-certs';
const SS_CRT_PATH = '/tmp/che/secret/ca.crt';

const CA_BUNDLE_PATH = '/tmp/ca-bundle.crt';

/**
 * Possible locations of default system certificates.
 */
const SYSTEM_CERTS = [
  '/etc/ssl/certs/ca-certificates.crt',
  '/etc/pki/tls/certs/ca-bundle.crt',
  '/etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem',
  '/etc/ssl/cert.pem',
];

export const getCertificate = new Promise<string | undefined>(async resolve => {
  const certificates: Buffer[] = [];

  // Look for default certificate.
  // Stop iterating when finding one.
  for (const cert of SYSTEM_CERTS) {
    if (await fs.pathExists(cert)) {
      // read the certificate
      certificates.push(await fs.readFile(cert));
      break;
    }
  }

  if (await fs.pathExists(SS_CRT_PATH)) {
    certificates.push(await fs.readFile(SS_CRT_PATH));
  }

  if (await fs.pathExists(PUBLIC_CRT_PATH)) {
    const publicCertificates = await fs.readdir(PUBLIC_CRT_PATH);
    for (const publicCertificate of publicCertificates) {
      const certPath = path.join(PUBLIC_CRT_PATH, publicCertificate);
      if ((await fs.pathExists(certPath)) && (await fs.stat(certPath)).isFile()) {
        certificates.push(await fs.readFile(certPath));
      }
    }
  }

  if (certificates.length > 0) {
    for (const certificate of certificates) {
      await fs.appendFile(CA_BUNDLE_PATH, certificate);
    }

    resolve(CA_BUNDLE_PATH);
  } else {
    resolve(undefined);
  }
});
