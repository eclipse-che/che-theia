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

import { CheTheiaPluginDevContainerMerger } from '../../src/devfile/che-theia-plugin-devcontainer-merger';
import { Container } from 'inversify';
import { VSCodeExtensionEntryWithSidecar } from '../../src/api/vscode-extension-entry';

describe('Test CheTheiaPluginDevContainerMerger', () => {
  let container: Container;

  let cheTheiaPluginDevContainerMerger: CheTheiaPluginDevContainerMerger;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    container = new Container();
    container.bind(CheTheiaPluginDevContainerMerger).toSelf().inSingletonScope();
    cheTheiaPluginDevContainerMerger = container.get(CheTheiaPluginDevContainerMerger);
  });

  test('basics', async () => {
    const entries: VSCodeExtensionEntryWithSidecar[] = [
      {
        id: 'foo',
        resolved: true,
        preferences: {
          myPreference: 'foo-dummy',
        },
        extensions: ['http://foo-first.vsix', 'http://foo-second.vsix'],
        sidecar: {
          image: 'foo',
          volumeMounts: [
            { name: 'fooVolume', path: '/fooPath' },
            { name: 'm2Volume', path: '/m2Path' },
          ],
          endpoints: [{ name: 'fooEndpoint', targetPort: 1 }],
        },
      },
      {
        id: 'bar',
        resolved: true,
        preferences: {
          barPreference: 'dummy',
        },
        extensions: ['http://bar.vsix'],
        sidecar: {
          image: 'foo',

          volumeMounts: [],
        },
      },
      {
        id: 'baz',
        resolved: true,
        extensions: ['http://baz.vsix'],
        sidecar: {
          image: 'foo',
          endpoints: [{ name: 'bazEndpoint', targetPort: 1 }],
        },
      },
    ];

    const devContainer = await cheTheiaPluginDevContainerMerger.merge(entries);
    // merge of preferences
    expect(devContainer.preferences).toStrictEqual({ barPreference: 'dummy', myPreference: 'foo-dummy' });

    // merge of endpoints
    expect(devContainer.endpoints).toStrictEqual([
      { name: 'fooEndpoint', targetPort: 1 },
      { name: 'bazEndpoint', targetPort: 1 },
    ]);

    // merge of volume mounts
    expect(devContainer.volumeMounts).toStrictEqual([
      {
        name: 'fooVolume',
        path: '/fooPath',
      },
      {
        name: 'm2Volume',
        path: '/m2Path',
      },
    ]);
  });
});
