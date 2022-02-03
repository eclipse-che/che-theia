/**********************************************************************
 * Copyright (c) 2021-2022 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

export const cheHttpServicePath = '/services/http-service';

export const HttpService = Symbol('HttpService');

export interface HttpService {
  get(url: string): Promise<string | undefined>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(url: string, responseType: 'text' | 'arraybuffer'): Promise<any | undefined>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  post(url: string, data?: any): Promise<string | undefined>;

  head(url: string): Promise<boolean>;
}
