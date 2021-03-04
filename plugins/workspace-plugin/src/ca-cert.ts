/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
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
const systemCerts = [
  // Debian, Ubuntu, Gentoo
  '/etc/ssl/certs/ca-certificates.crt',
  // Fedora, RHEL 6
  '/etc/pki/tls/certs/ca-bundle.crt',
  // OpenSUSE
  '/etc/ssl/ca-bundle.pem',
  // OpenELEC
  '/etc/pki/tls/cacert.pem',
  // CentOS, RHEL 7
  '/etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem',
  // Alpine
  '/etc/ssl/cert.pem',
];

export const getCertificate = new Promise<string | undefined>(async resolve => {
  const certificates: Buffer[] = [];

  // Look for default certificate.
  // Stop iterating when finding one.
  for (const cert of systemCerts) {
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
      if (publicCertificate.endsWith('.crt')) {
        const certPath = path.join(PUBLIC_CRT_PATH, publicCertificate);
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
