/**********************************************************************
 * Copyright (c) 2019-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

/* eslint-disable @typescript-eslint/no-explicit-any */

import 'reflect-metadata';

import { Container } from 'inversify';
import { GitListener } from '../src/git/git-listener';
import { SSHPlugin } from '../src/plugin/plugin-model';

describe('Test git-listener', () => {
  let container: Container;

  const sshPlugin = {} as any;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();

    container = new Container();
    container.bind(SSHPlugin).toConstantValue(sshPlugin);
    container.bind(GitListener).toSelf().inSingletonScope();
  });

  test('Check version comparer', async () => {
    const gitListener = container.get(GitListener);

    expect(gitListener.isVersionNewer('1.49.3', '2')).toBe(true);
    expect(gitListener.isVersionNewer('2', '1')).toBe(false);
    expect(gitListener.isVersionNewer('2', '1.15.0')).toBe(false);
    expect(gitListener.isVersionNewer('2', '2.21')).toBe(true);
    expect(gitListener.isVersionNewer('2.21.3', '2.21')).toBe(false);
    expect(gitListener.isVersionNewer('1.49.2', '1.49.3')).toBe(true);
    expect(gitListener.isVersionNewer('1.49.2', '1.50.0')).toBe(true);
  });
});
