/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/
/* eslint-disable @typescript-eslint/no-explicit-any */

const axios: any = jest.createMockFromModule('axios');

// map between URL and content
const myContent: Map<string, any> = new Map();
const myErrors: Map<string, any> = new Map();

function __setContent(url: string, content: string): void {
  myContent.set(url, content);
}

function __setError(url: string, error: any): void {
  myErrors.set(url, error);
}

function get(url: string): any {
  if (myErrors.has(url)) {
    throw myErrors.get(url);
  }

  return Promise.resolve({ data: myContent.get(url) });
}
function __clearMock(): void {
  myContent.clear();
  myErrors.clear();
}

axios.get = jest.fn(get);
axios.__setContent = __setContent;
axios.__setError = __setError;
axios.__clearMock = __clearMock;
module.exports = axios;
