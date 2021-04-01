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
import { DevContainerComponentFinder } from '../../src/devfile/dev-container-component-finder';
import { DevfileContext } from '../../src/api/devfile-context';

describe('Test DevContainerComponentFinder', () => {
  let container: Container;

  let devContainerComponentFinder: DevContainerComponentFinder;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    container = new Container();
    container.bind(DevContainerComponentFinder).toSelf().inSingletonScope();
    devContainerComponentFinder = container.get(DevContainerComponentFinder);
  });

  test('basics', async () => {
    const devfileContext = {
      devWorkspace: {
        spec: {
          template: {
            components: [
              { name: 'foo' },
              {
                name: 'theia-ide',
              },
              {
                name: 'my-container',
                container: {
                  image: 'user-image:123',
                },
              },
            ],
          },
        },
      },
    } as DevfileContext;
    const devWorkspaceSpecTemplateComponents = await devContainerComponentFinder.find(devfileContext);
    expect(devWorkspaceSpecTemplateComponents.name).toBe('my-container');
  });

  test('missing dev container', async () => {
    const devfileContext = {
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
    } as DevfileContext;
    await expect(devContainerComponentFinder.find(devfileContext)).rejects.toThrow(
      'Not able to find any dev container component in DevWorkspace'
    );
  });

  test('missing dev container (no components)', async () => {
    const devfileContext = {
      devWorkspace: {},
    } as DevfileContext;
    await expect(devContainerComponentFinder.find(devfileContext)).rejects.toThrow(
      'Not able to find any dev container component in DevWorkspace'
    );
  });

  test('too many dev container', async () => {
    const devfileContext = {
      devWorkspace: {
        spec: {
          template: {
            components: [
              { name: 'foo' },
              {
                name: 'theia-ide',
              },
              {
                name: 'my-container-1',
                container: {
                  image: 'user-image:123',
                },
              },
              {
                name: 'my-container-2',
                container: {
                  image: 'user-image:123',
                },
              },
            ],
          },
        },
      },
    } as DevfileContext;
    await expect(devContainerComponentFinder.find(devfileContext)).rejects.toThrow(
      'Too many components have been found that could be considered as dev container'
    );
  });
});
