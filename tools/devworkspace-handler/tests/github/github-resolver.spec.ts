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
import 'reflect-metadata';

import { Container } from 'inversify';
import { GithubResolver } from '../../src/github/github-resolver';

describe('Test PluginRegistryResolver', () => {
  let container: Container;

  let githubResolver: GithubResolver;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    container = new Container();
    container.bind(GithubResolver).toSelf().inSingletonScope();
    githubResolver = container.get(GithubResolver);
  });

  test('basic resolve', async () => {
    expect(githubResolver.resolve('http://github.com/eclipse/che').getUrl()).toBe(
      'https://github.com/eclipse/che/tree/HEAD/'
    );
    expect(githubResolver.resolve('https://github.com/eclipse/che/tree/7.30.x').getUrl()).toBe(
      'https://github.com/eclipse/che/tree/7.30.x/'
    );

    expect(githubResolver.resolve('http://github.com/eclipse/che').getContentUrl('README.md')).toBe(
      'https://raw.githubusercontent.com/eclipse/che/HEAD/README.md'
    );

    expect(githubResolver.resolve('http://github.com/eclipse/che').getCloneUrl()).toBe(
      'https://github.com/eclipse/che.git'
    );

    expect(githubResolver.resolve('https://github.com/eclipse/che').getRepoName()).toBe('che');

    expect(githubResolver.resolve('http://github.com/eclipse/che').getBranchName()).toBe('HEAD');
    expect(githubResolver.resolve('https://github.com/eclipse/che/tree/test-branch').getBranchName()).toBe(
      'test-branch'
    );
  });

  test('error', async () => {
    expect(() => {
      githubResolver.resolve('http://unknown/che');
    }).toThrow('Invalid github URL:');
  });
});
