/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Mock of @theia/plugin module
 * @author Florent Benoit
 */
const che: any = {};

// map between URL and content
const httpContent: Map<string, any> = new Map();
const httpErrors: Map<string, any> = new Map();

function setHttpContentMethod(url: string, content: string): void {
    httpContent.set(url, content);
}

function setHttpContentErrorMethod(url: string, error: any): void {
    httpErrors.set(url, error);
}

function getMethod(url: string): any {
  if (httpErrors.has(url)) {
    throw httpErrors.get(url);
  }

  return Promise.resolve(httpContent.get(url));
}
function clearMocksMethod(): void {
    httpContent.clear();
    httpErrors.clear();
}

che.http = {
    get: getMethod,
}
che.workspace = {};
che.__clearHttpMocks = clearMocksMethod
che.__setHttpContent = setHttpContentMethod
che.__setHttpContentError = setHttpContentErrorMethod
che.http.get = jest.spyOn(che.http, 'get');
module.exports = che;
