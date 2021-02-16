/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as fs from 'fs-extra';
import * as path from 'path';

import { PUBLIC_CRT_PATH, SS_CRT_PATH } from './che-server-https';

import { CertificateService } from '@eclipse-che/theia-remote-api/lib/common/certificate-service';
import { injectable } from 'inversify';

@injectable()
export class CheServerCertificateServiceImpl implements CertificateService {
  public async getCertificateAuthority(): Promise<Array<Buffer> | undefined> {
    const certificateAuthority: Buffer[] = [];
    const existsSSCRT = await fs.pathExists(SS_CRT_PATH);
    if (existsSSCRT) {
      const content = await fs.readFile(SS_CRT_PATH);
      certificateAuthority.push(content);
    }

    const existsPublicCrt = await fs.pathExists(PUBLIC_CRT_PATH);
    if (existsPublicCrt) {
      const publicCertificates = await fs.readdir(PUBLIC_CRT_PATH);
      for (const publicCertificate of publicCertificates) {
        if (publicCertificate.endsWith('.crt')) {
          const certPath = path.join(PUBLIC_CRT_PATH, publicCertificate);
          const content = await fs.readFile(certPath);
          certificateAuthority.push(content);
        }
      }
    }

    return certificateAuthority.length > 0 ? certificateAuthority : undefined;
  }
}
