/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import axios, { AxiosInstance } from 'axios';

import { CheGithubMain } from '../common/che-protocol';
import { GithubUser } from '@eclipse-che/plugin';
import { OauthUtils } from '@eclipse-che/theia-remote-api/lib/browser/oauth-utils';
import { interfaces } from 'inversify';

export class CheGithubMainImpl implements CheGithubMain {
  private axiosInstance: AxiosInstance = axios;
  private token: string | undefined;
  private readonly oAuthUtils: OauthUtils;

  constructor(container: interfaces.Container) {
    this.oAuthUtils = container.get(OauthUtils);
  }

  async $uploadPublicSshKey(publicKey: string): Promise<void> {
    await this.fetchToken();
    await this.axiosInstance.post(
      'https://api.github.com/user/keys',
      {
        title: 'che-theia',
        key: publicKey,
      },
      { headers: { Authorization: `Bearer ${this.token}` } }
    );
  }

  async $getToken(): Promise<string> {
    await this.fetchToken();
    if (this.token) {
      return this.token;
    } else {
      throw new Error('Failed to get GitHub authentication token');
    }
  }

  async $getUser(): Promise<GithubUser> {
    await this.fetchToken();
    return this.getUser();
  }

  private async getUser(): Promise<GithubUser> {
    const result = await this.axiosInstance.get<GithubUser>('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    return result.data;
  }

  private async fetchToken(): Promise<void> {
    if (!this.token) {
      await this.updateToken();
    } else {
      try {
        // Validate the GitHub token.
        await this.getUser();
      } catch (e) {
        await this.updateToken();
      }
    }
  }

  private async updateToken(): Promise<void> {
    const oAuthProvider = 'github';
    const authenticateAndUpdateToken: () => Promise<void> = async () => {
      await this.oAuthUtils.authenticate(oAuthProvider, ['repo', 'user', 'write:public_key']);
      this.token = await this.oAuthUtils.getToken(oAuthProvider);
    };
    if (await this.oAuthUtils.isAuthenticated(oAuthProvider)) {
      try {
        // Validate the GitHub token.
        await this.getUser();
      } catch (e) {
        if (/Request failed with status code 401/g.test(e.message)) {
          await authenticateAndUpdateToken();
        }
      }
    } else {
      await authenticateAndUpdateToken();
    }
  }
}
