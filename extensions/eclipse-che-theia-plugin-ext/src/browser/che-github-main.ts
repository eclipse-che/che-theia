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
    await this.axiosInstance.post('https://api.github.com/user/keys?access_token=' + this.token, {
      title: 'che-theia',
      key: publicKey,
    });
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
    const result = await this.axiosInstance.get<GithubUser>('https://api.github.com/user?access_token=' + this.token);
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
    try {
      this.token = await this.oAuthUtils.getToken(oAuthProvider);
      // Validate the GitHub token.
      await this.getUser();
    } catch (e) {
      if (e.message.indexOf('Request failed with status code 401') !== -1) {
        await this.oAuthUtils.authenticate(oAuthProvider, ['write:public_key']);
        this.token = await this.oAuthUtils.getToken(oAuthProvider);
      }
    }
  }
}
