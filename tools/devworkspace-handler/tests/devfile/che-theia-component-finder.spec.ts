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
import { Container } from 'inversify';
import { DevfileContext } from '../../src/api/devfile-context';

describe('Test CheTheiaComponentFinder', () => {
  let container: Container;

  let cheTheiaComponentFinder: CheTheiaComponentFinder;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    container = new Container();
    container.bind(CheTheiaComponentFinder).toSelf().inSingletonScope();
    cheTheiaComponentFinder = container.get(CheTheiaComponentFinder);
  });

  test('in a template', async () => {
    const devfileContext = {
      devWorkspaceTemplates: [
        {},
        {
          spec: {
            components: [
              { name: 'foo' },
              {
                name: 'theia-ide',
              },
            ],
          },
        },
      ],
    } as DevfileContext;
    const devWorkspaceSpectTemplateComponents = await cheTheiaComponentFinder.find(devfileContext);
    expect(devWorkspaceSpectTemplateComponents.name).toBe('theia-ide');
  });

  test('in the main devWorkspace', async () => {
    const devfileContext = {
      devWorkspaceTemplates: [],
      devWorkspace: {
        spec: {
          template: {
            components: [
              { name: 'foo' },
              {
                name: 'theia-ide',
              },
            ],
          },
        },
      },
    } as any as DevfileContext;
    const devWorkspaceSpectTemplateComponents = await cheTheiaComponentFinder.find(devfileContext);
    expect(devWorkspaceSpectTemplateComponents.name).toBe('theia-ide');
  });

  test('missing', async () => {
    const devfileContext = {
      devWorkspaceTemplates: [],
      devWorkspace: {},
    } as any as DevfileContext;
    await expect(cheTheiaComponentFinder.find(devfileContext)).rejects.toThrow(
      'Not able to find theia-ide component in DevWorkspace and its templates'
    );
  });
});
