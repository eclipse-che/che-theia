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

  let originalConsoleWarn = console.warn;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    container = new Container();
    container.bind(DevContainerComponentFinder).toSelf().inSingletonScope();
    devContainerComponentFinder = container.get(DevContainerComponentFinder);
    console.warn = jest.fn();
  });

  afterEach(() => {
    console.warn = originalConsoleWarn;
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

  test('only one container without mountSources:false', async () => {
    const devfileContext = {
      devWorkspace: {
        spec: {
          template: {
            components: [
              {
                name: 'container-with-mount-sources-false',
                container: {
                  mountSources: false,
                  image: 'user-image:123',
                },
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

  test('take first one when many dev container', async () => {
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
    const devWorkspaceSpecTemplateComponents = await devContainerComponentFinder.find(devfileContext);
    expect(devWorkspaceSpecTemplateComponents.name).toBe('my-container-1');
    expect(console.warn).toBeCalledWith(
      'More than one dev container component has been potentially found, taking the first one of my-container-1,my-container-2'
    );
  });

  test('annotated', async () => {
    const devfileContext = {
      devWorkspace: {
        spec: {
          template: {
            components: [
              {
                name: 'foo',
                container: {
                  image: 'user-image:123',
                },
              },
              {
                name: 'my-container',
                attributes: {
                  'che-theia.eclipse.org/dev-container': true,
                },
                container: {
                  image: 'user-image:123',
                },
              },
              {
                name: 'bar',
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

  test('too many annotated container', async () => {
    const devfileContext = {
      devWorkspace: {
        spec: {
          template: {
            components: [
              {
                name: 'foo',
                attributes: {
                  'che-theia.eclipse.org/dev-container': true,
                },
                container: {
                  image: 'user-image:123',
                },
              },
              {
                name: 'my-container',
                attributes: {
                  'che-theia.eclipse.org/dev-container': true,
                },
                container: {
                  image: 'user-image:123',
                },
              },
              {
                name: 'bar',
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
      'Only one container can be annotated with che-theia.eclipse.org/dev-container: true'
    );
  });
});
