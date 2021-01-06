/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as fs from 'fs';
import * as path from 'path';
import * as theia from '@theia/plugin';

const PUBLIC_CRT_PATH = '/public-certs';
const SS_CRT_PATH = '/tmp/che/secret/ca.crt';

const CA_BUNDLE_PATH = '/tmp/ca-bundle.crt';

let bundle: string | undefined = undefined;

export async function getAuthorityCertificate(): Promise<string | undefined> {
  if (bundle !== undefined) {
    return bundle;
  }

  const certificateAuthority: Buffer[] = [];

  const output = theia.window.createOutputChannel('workspace plugin');
  output.appendLine('Prepare CA bundle:');

  if (fs.existsSync(SS_CRT_PATH)) {
    output.appendLine('   > ' + SS_CRT_PATH);

    certificateAuthority.push(fs.readFileSync(SS_CRT_PATH));
  }

  if (fs.existsSync(PUBLIC_CRT_PATH)) {
    const publicCertificates = fs.readdirSync(PUBLIC_CRT_PATH);
    for (const publicCertificate of publicCertificates) {
      if (publicCertificate.endsWith('.crt')) {
        const certPath = path.join(PUBLIC_CRT_PATH, publicCertificate);

        output.appendLine('   > ' + certPath);

        certificateAuthority.push(fs.readFileSync(certPath));
      }
    }
  }

  if (certificateAuthority.length > 0) {
    for (const certificate of certificateAuthority) {
      fs.appendFileSync(CA_BUNDLE_PATH, certificate);
    }

    bundle = CA_BUNDLE_PATH;
  } else {
    bundle = '';
  }

  return bundle;
}
