/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/
import 'reflect-metadata';

import * as che from '@eclipse-che/plugin';

import { Container } from 'inversify';
import { WorkspaceHandler } from '../../src/workspace/workspace-handler';

describe('Test WorkspaceHandler', () => {
  let container: Container;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    container = new Container();
    container.bind(WorkspaceHandler).toSelf().inSingletonScope();
  });

  test('basics', async () => {
    const workspaceHandler = container.get(WorkspaceHandler);
    const restartMethod = jest.fn();
    che.workspace.restartWorkspace = restartMethod;
    await workspaceHandler.restart('Hello this is my Message');
    expect(restartMethod).toBeCalled();
    const registerCallbackCall = restartMethod.mock.calls[0];
    expect(registerCallbackCall[0]).toEqual({ prompt: true, promptMessage: 'Hello this is my Message' });
  });
});
