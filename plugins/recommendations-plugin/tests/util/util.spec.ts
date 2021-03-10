/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { Deferred } from '../../src/util/deferred';

describe('Test Deferred', () => {
  test('deferred', async () => {
    const deferredBoolean = new Deferred<boolean>();
    setTimeout(() => deferredBoolean.resolve(true), 500);
    const promise = deferredBoolean.promise;
    const result = await promise;
    expect(result).toBeTruthy();
  });
});
