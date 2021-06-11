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

import { CheTheiaComponentFinder } from '../../src/devfile/che-theia-component-finder';
import { CheTheiaComponentUpdater } from '../../src/devfile/che-theia-component-updater';
import { Container } from 'inversify';
import { DevfileContext } from '../../src/api/devfile-context';
import { V1alpha2DevWorkspaceSpecTemplateComponents } from '@devfile/api';
import { VSCodeExtensionEntry } from '../../src/api/vscode-extension-entry';

describe('Test CheTheiaComponentFinder', () => {
  let container: Container;

  let cheTheiaComponentUpdater: CheTheiaComponentUpdater;
  const cheTheiaComponentFinderFindMethod = jest.fn();
  const cheTheiaComponentFinder = {
    find: cheTheiaComponentFinderFindMethod,
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    container = new Container();
    container.bind(CheTheiaComponentUpdater).toSelf().inSingletonScope();
    container.bind(CheTheiaComponentFinder).toConstantValue(cheTheiaComponentFinder);
    cheTheiaComponentUpdater = container.get(CheTheiaComponentUpdater);
  });

  test('basics', async () => {
    const theiaComponent: V1alpha2DevWorkspaceSpecTemplateComponents = {
      name: 'theia',
    };
    const cheTheiaExtensions: VSCodeExtensionEntry[] = [
      {
        id: 'foo',
        resolved: true,
        preferences: {
          myPreference: 'foo-dummy',
        },
        extensions: ['http://foo-first.vsix', 'http://foo-second.vsix'],
      },
      {
        id: 'bar',
        resolved: true,
        preferences: {
          barPreference: 'dummy',
        },
        extensions: ['http://bar.vsix'],
      },
      {
        id: 'baz',
        resolved: true,
        extensions: ['http://baz.vsix'],
      },
    ];
    cheTheiaComponentFinderFindMethod.mockResolvedValue(theiaComponent);
    const devfileContext = {} as DevfileContext;
    await cheTheiaComponentUpdater.insert(devfileContext, cheTheiaExtensions);
    expect(theiaComponent.attributes).toBeDefined();
    const attributes = theiaComponent.attributes || ({} as any);
    expect(attributes['che-theia.eclipse.org/vscode-extensions']).toStrictEqual([
      'http://foo-first.vsix',
      'http://foo-second.vsix',
      'http://bar.vsix',
      'http://baz.vsix',
    ]);
    expect(attributes['che-theia.eclipse.org/vscode-preferences']).toStrictEqual({
      barPreference: 'dummy',
      myPreference: 'foo-dummy',
    });
  });

  test('empty extensions', async () => {
    const theiaComponent: V1alpha2DevWorkspaceSpecTemplateComponents = {
      name: 'theia',
    };

    const devfileContext = {} as DevfileContext;
    const cheTheiaExtensions: VSCodeExtensionEntry[] = [];
    await cheTheiaComponentUpdater.insert(devfileContext, cheTheiaExtensions);
    // do not add any attributes
    expect(theiaComponent.attributes).toBeUndefined();
  });

  test('existing attributes and no preferences', async () => {
    const theiaComponent: V1alpha2DevWorkspaceSpecTemplateComponents = {
      name: 'theia',
      attributes: {
        myItem: 'foo',
      },
    };
    const cheTheiaExtensions: VSCodeExtensionEntry[] = [
      {
        id: 'foo',
        resolved: true,
        extensions: ['http://foo.vsix'],
      },
      {
        id: 'bar',
        resolved: true,
        extensions: ['http://bar.vsix'],
      },
    ];
    cheTheiaComponentFinderFindMethod.mockResolvedValue(theiaComponent);
    const devfileContext = {} as DevfileContext;
    await cheTheiaComponentUpdater.insert(devfileContext, cheTheiaExtensions);
    expect(theiaComponent.attributes).toBeDefined();
    const attributes = theiaComponent.attributes || ({} as any);
    expect(attributes['che-theia.eclipse.org/vscode-extensions']).toStrictEqual(['http://foo.vsix', 'http://bar.vsix']);
    // no preferences
    expect(attributes['che-theia.eclipse.org/vscode-preferences']).toBeUndefined();

    // existing attribute is kept
    expect(attributes.myItem).toBe('foo');
  });
});
