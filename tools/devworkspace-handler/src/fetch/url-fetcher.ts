/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/
import { inject, injectable } from 'inversify';

import { AxiosInstance } from 'axios';

/**
 * Allow to grab external content
 * if browser support is enabled, it will update URLs to make them work on browser side.
 */
@injectable()
export class UrlFetcher {
  // Can't use AxiosInstance interface there
  @inject(Symbol.for('AxiosInstance'))
  private axiosInstance: AxiosInstance;

  // fetch content optionally, if the URL is not found, we return undefined without throwing errors
  async fetchTextOptionalContent(url: string): Promise<string | undefined> {
    try {
      const response = await this.axiosInstance.get<string>(url, {
        responseType: 'text',
      });
      return response.data;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      // not found then we return undefined
      if (error.response && error.response.status === 404) {
        return undefined;
      }
      throw error;
    }
  }

  // fetch content
  async fetchText(url: string): Promise<string> {
    const response = await this.axiosInstance.get<string>(url, {
      responseType: 'text',
    });
    return response.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }
}
