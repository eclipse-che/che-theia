/**********************************************************************
 * Copyright (c) 2018-2022 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/
import * as fs from 'fs-extra';
import * as path from 'path';

import { CheGitHubService } from '../common/che-protocol';
import { injectable } from 'inversify';

@injectable()
export class CheGithubServiceImpl implements CheGitHubService {
  async getToken(): Promise<string | undefined> {
    const credentialsPath = path.resolve('/.git-credentials', 'credentials');
    if (fs.existsSync(credentialsPath)) {
      const token = fs.readFileSync(credentialsPath).toString();
      return token.substring(token.lastIndexOf(':') + 1, token.indexOf('@'));
    }
  }
}
