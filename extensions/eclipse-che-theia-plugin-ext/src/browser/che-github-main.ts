/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { CheGitHubService, CheGithubMain } from '../common/che-protocol';
import axios, { AxiosInstance } from 'axios';

import { GithubUser } from '@eclipse-che/plugin';
import { interfaces } from 'inversify';

export class CheGithubMainImpl implements CheGithubMain {
  private axiosInstance: AxiosInstance = axios;
  private token: string | undefined;

  constructor(container: interfaces.Container) {
    const cheGitHubService: CheGitHubService = container.get(CheGitHubService);
    cheGitHubService.getToken().then(token => (this.token = token));
  }

  async $uploadPublicSshKey(publicKey: string): Promise<void> {
    if (!this.token) {
      throw new Error('GitHub authentication token is not setup');
    }
    try {
      await this.axiosInstance.post(
        'https://api.github.com/user/keys',
        {
          title: 'che-theia',
          key: publicKey,
        },
        { headers: { Authorization: `Bearer ${this.token}` } }
      );
    } catch (error) {
      console.error(error.message);
      throw error;
    }
  }

  async $getToken(): Promise<string> {
    this.checkToken();
    return this.token ? this.token : '';
  }

  async $getUser(): Promise<GithubUser> {
    this.checkToken();
    const result = await this.axiosInstance.get<GithubUser>('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    return result.data;
  }

  checkToken(): void {
    if (!this.token) {
      throw new Error('GitHub authentication token is not setup');
    }
  }
}
