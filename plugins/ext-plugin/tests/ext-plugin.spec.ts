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

import * as che from '@eclipse-che/plugin';
import * as extPlugin from '../src/ext-plugin';

describe('Test ExtPlugin', () => {
  test('start', async () => {
    (che as any).setWorkspaceOutput({ id: '1234' });

    const api: any = await extPlugin.start();
    expect(api).toBeDefined();
    const workspace = await api.workspace.getCurrentWorkspace();
    expect(workspace.id).toBe('1234');
  });
});
