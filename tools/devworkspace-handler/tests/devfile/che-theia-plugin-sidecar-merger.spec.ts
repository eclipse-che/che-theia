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

import { CheTheiaPluginSidecarMerger } from '../../src/devfile/che-theia-plugin-sidecar-merger';
import { Container } from 'inversify';
import { VSCodeExtensionEntryWithSidecar } from '../../src/api/vscode-extension-entry';

describe('Test CheTheiaPluginSidecarMerger', () => {
  let container: Container;

  let cheTheiaPluginSidecarMerger: CheTheiaPluginSidecarMerger;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    container = new Container();
    container.bind(CheTheiaPluginSidecarMerger).toSelf().inSingletonScope();
    cheTheiaPluginSidecarMerger = container.get(CheTheiaPluginSidecarMerger);
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
        sidecarName: 'fooName',
        sidecar: {
          image: 'shared-image:123',
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
        preferences: {
          bazPreference: 'dummyBaz',
        },
        sidecarName: 'bazName',
        sidecar: {
          image: 'shared-image:123',
          endpoints: [{ name: 'bazEndpoint', targetPort: 1 }],
        },
      },
    ];

    const mergedEntries = await cheTheiaPluginSidecarMerger.merge(entries);
    // merged occured, less entries
    expect(mergedEntries.length).toBe(entries.length - 1);

    const firstEntry = mergedEntries[0];
    expect(firstEntry.resolved).toBeTruthy();
    expect(firstEntry.optional).toBeFalsy();

    expect(firstEntry.id).toBe('merged-shared-image:123');
    expect(firstEntry.extensions).toStrictEqual(['http://foo-first.vsix', 'http://foo-second.vsix', 'http://baz.vsix']);
    expect(firstEntry.preferences).toStrictEqual({ myPreference: 'foo-dummy', bazPreference: 'dummyBaz' });
    expect(firstEntry.sidecarName).toBe('fooName');
  });
});
