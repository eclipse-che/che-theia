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

const globby: any = jest.requireActual('globby');

let customError: any | undefined = undefined;
let multipleEnd = false;

function __setStreamError(error: string): void {
  customError = error;
}

function __setStreamEnd(): void {
  multipleEnd = true;
}

globby.__setStreamError = __setStreamError;
globby.__setStreamEnd = __setStreamEnd;

const originalStream = globby.stream;
globby.stream = (pattern: any, options?: any) => {
  const result = originalStream(pattern, options);
  if (customError) {
    result.emit('error', customError);
  }
  if (multipleEnd) {
    result.emit('end');
  }
  return result;
};

module.exports = globby;
