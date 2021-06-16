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
import { DevfileContext } from '../../src/api/devfile-context';
import { V1alpha2DevWorkspaceTemplate } from '@devfile/api';
import { VsixInstallerComponentUpdater } from '../../src/vsix-installer/vsix-installer-component-updater';

describe('Test VsixInstallerComponentUpdater', () => {
  let container: Container;

  let vsixInstallerComponentUpdater: VsixInstallerComponentUpdater;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    container = new Container();
    container.bind(VsixInstallerComponentUpdater).toSelf().inSingletonScope();
    vsixInstallerComponentUpdater = container.get(VsixInstallerComponentUpdater);
  });

  test('basics', async () => {
    const devWorkspaceTemplates: V1alpha2DevWorkspaceTemplate[] = [];
    const devWorkspace = {
      spec: {
        template: {
          components: [],
        },
      },
    };
    const suffix = 'my-suffix';
    const devfileContext = { devWorkspace, devWorkspaceTemplates, suffix } as any as DevfileContext;
    await vsixInstallerComponentUpdater.add(devfileContext);
    // a new template added
    expect(devWorkspaceTemplates.length).toBe(1);
    const template = devWorkspaceTemplates[0] as any;
    expect(template.metadata.name).toBe('che-theia-vsix-installer-my-suffix');
  });

  test('error if missing spec template components', async () => {
    const devWorkspace = {
      spec: {
        template: {},
      },
    };
    const devfileContext = { devWorkspace } as DevfileContext;
    await expect(vsixInstallerComponentUpdater.add(devfileContext)).rejects.toThrow('No components');
  });

  test('error if missing spec components', async () => {
    const devWorkspace = {};
    const devfileContext = { devWorkspace } as DevfileContext;
    await expect(vsixInstallerComponentUpdater.add(devfileContext)).rejects.toThrow('No components');
  });
});
