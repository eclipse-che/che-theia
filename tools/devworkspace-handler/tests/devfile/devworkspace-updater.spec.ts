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

import { VSCodeExtensionEntry, VSCodeExtensionEntryWithSidecar } from '../../src/api/vscode-extension-entry';

import { CheTheiaComponentUpdater } from '../../src/devfile/che-theia-component-updater';
import { Container } from 'inversify';
import { DevContainerComponentUpdater } from '../../src/devfile/dev-container-component-updater';
import { DevWorkspaceUpdater } from '../../src/devfile/devworkspace-updater';
import { DevfileContext } from '../../src/api/devfile-context';
import { SidecarComponentsCreator } from '../../src/devfile/sidecar-components-creator';
import { V1alpha2DevWorkspaceSpecTemplateComponents } from '@devfile/api';
import { VSCodeExtensionDevContainer } from '../../src/devfile/vscode-extension-dev-container';
import { VsixInstallerComponentUpdater } from '../../src/vsix-installer/vsix-installer-component-updater';

describe('Test DevWorkspaceUpdater', () => {
  let container: Container;

  let devWorkspaceUpdater: DevWorkspaceUpdater;

  const sidecarComponentsCreatorCreateMethod = jest.fn();
  const sidecarComponentsCreator = {
    create: sidecarComponentsCreatorCreateMethod,
  } as any;

  const cheTheiaComponentUpdaterInsertMethod = jest.fn();
  const cheTheiaComponentUpdater = {
    insert: cheTheiaComponentUpdaterInsertMethod,
  } as any;

  const devContainerComponentUpdaterInsertMethod = jest.fn();
  const devContainerComponentUpdater = {
    insert: devContainerComponentUpdaterInsertMethod,
  } as any;

  const vsixInstallerComponentUpdaterAddMethod = jest.fn();
  const vsixInstallerComponentUpdater = {
    add: vsixInstallerComponentUpdaterAddMethod,
  } as any;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    container = new Container();
    container.bind(DevWorkspaceUpdater).toSelf().inSingletonScope();
    container.bind(SidecarComponentsCreator).toConstantValue(sidecarComponentsCreator);
    container.bind(CheTheiaComponentUpdater).toConstantValue(cheTheiaComponentUpdater);
    container.bind(DevContainerComponentUpdater).toConstantValue(devContainerComponentUpdater);
    container.bind(VsixInstallerComponentUpdater).toConstantValue(vsixInstallerComponentUpdater);
  });

  test('basics', async () => {
    container.bind('boolean').toConstantValue(true).whenTargetNamed('INSERT_TEMPLATES');
    devWorkspaceUpdater = container.get(DevWorkspaceUpdater);

    const devfileContext = {
      devWorkspace: {
        spec: {
          template: {
            components: [
              {
                name: 'bar',
              },
            ],
          },
        },
      },
      devWorkspaceTemplates: [
        {
          metadata: {
            name: 'foo',
          },
        },
      ],
    } as DevfileContext;

    const componentsToAdd: V1alpha2DevWorkspaceSpecTemplateComponents[] = [
      {
        name: 'component-added-1',
      },
    ];
    sidecarComponentsCreatorCreateMethod.mockResolvedValue(componentsToAdd);

    const cheTheiaExtensions: VSCodeExtensionEntry[] = [];
    const extensionsWithSidecars: VSCodeExtensionEntryWithSidecar[] = [];
    const extensionsForDevContainer: VSCodeExtensionDevContainer = {
      extensions: [],
    };
    await devWorkspaceUpdater.update(
      devfileContext,
      cheTheiaExtensions,
      extensionsWithSidecars,
      extensionsForDevContainer
    );

    // check components have been added
    expect(devfileContext.devWorkspace.spec?.template?.components).toStrictEqual([
      {
        name: 'bar',
      },
      {
        name: 'foo',
        plugin: {
          kubernetes: {
            name: 'foo',
          },
        },
      },
      {
        name: 'component-added-1',
      },
    ]);
    expect(devContainerComponentUpdaterInsertMethod).toBeCalledWith(devfileContext, extensionsForDevContainer);
  });

  test('basics without insert', async () => {
    container.bind('boolean').toConstantValue(false).whenTargetNamed('INSERT_TEMPLATES');
    devWorkspaceUpdater = container.get(DevWorkspaceUpdater);

    const devfileContext = {
      devWorkspace: {
        spec: {
          template: {},
        },
      },
      devWorkspaceTemplates: [{}],
    } as DevfileContext;

    const componentsToAdd: V1alpha2DevWorkspaceSpecTemplateComponents[] = [
      {
        name: 'component-added-1',
      },
    ];
    sidecarComponentsCreatorCreateMethod.mockResolvedValue(componentsToAdd);

    const cheTheiaExtensions: VSCodeExtensionEntry[] = [];
    const extensionsWithSidecars: VSCodeExtensionEntryWithSidecar[] = [];
    const extensionsForDevContainer = undefined;
    await devWorkspaceUpdater.update(
      devfileContext,
      cheTheiaExtensions,
      extensionsWithSidecars,
      extensionsForDevContainer
    );
    expect(devContainerComponentUpdaterInsertMethod).toBeCalledTimes(0);

    // check components have been added
    expect(devfileContext.devWorkspace.spec?.template?.components).toStrictEqual([
      {
        name: 'component-added-1',
      },
    ]);
  });

  test('error insert no name', async () => {
    container.bind('boolean').toConstantValue(true).whenTargetNamed('INSERT_TEMPLATES');
    devWorkspaceUpdater = container.get(DevWorkspaceUpdater);

    const devfileContext = {
      devWorkspace: {
        spec: {
          template: {},
        },
      },
      devWorkspaceTemplates: [{}],
    } as DevfileContext;

    const componentsToAdd: V1alpha2DevWorkspaceSpecTemplateComponents[] = [
      {
        name: 'component-added-1',
      },
    ];
    sidecarComponentsCreatorCreateMethod.mockResolvedValue(componentsToAdd);

    const cheTheiaExtensions: VSCodeExtensionEntry[] = [];
    const extensionsWithSidecars: VSCodeExtensionEntryWithSidecar[] = [];
    const extensionsForDevContainer: VSCodeExtensionDevContainer = {
      extensions: [],
    };
    await expect(
      devWorkspaceUpdater.update(devfileContext, cheTheiaExtensions, extensionsWithSidecars, extensionsForDevContainer)
    ).rejects.toThrow('No name found for the template');
  });

  test('error no template insert no name', async () => {
    container.bind('boolean').toConstantValue(true).whenTargetNamed('INSERT_TEMPLATES');
    devWorkspaceUpdater = container.get(DevWorkspaceUpdater);

    const devfileContext = {
      devWorkspace: {},
    } as DevfileContext;

    const cheTheiaExtensions: VSCodeExtensionEntry[] = [];
    const extensionsWithSidecars: VSCodeExtensionEntryWithSidecar[] = [];
    const extensionsForDevContainer: VSCodeExtensionDevContainer = {
      extensions: [],
    };
    await expect(
      devWorkspaceUpdater.update(devfileContext, cheTheiaExtensions, extensionsWithSidecars, extensionsForDevContainer)
    ).rejects.toThrow('Can update a dev workspace only if there is a template in spec object');
  });
});
