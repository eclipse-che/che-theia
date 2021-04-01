/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { VSCodeExtensionEntry, VSCodeExtensionEntryWithSidecar } from '../api/vscode-extension-entry';
import { inject, injectable, named } from 'inversify';

import { CheTheiaComponentUpdater } from './che-theia-component-updater';
import { DevContainerComponentUpdater } from './dev-container-component-updater';
import { DevfileContext } from '../api/devfile-context';
import { SidecarComponentsCreator } from './sidecar-components-creator';
import { VSCodeExtensionDevContainer } from './vscode-extension-dev-container';
import { VsixInstallerComponentUpdater } from '../vsix-installer/vsix-installer-component-updater';

/**
 * This class is responsible to:
 *  - add annotations about vsix files to add on che-theia component
 *  - add sidecar components + their vsix files
 *  - add vsix installer component
 */
@injectable()
export class DevWorkspaceUpdater {
  @inject(SidecarComponentsCreator)
  private sidecarComponentsCreator: SidecarComponentsCreator;

  @inject(CheTheiaComponentUpdater)
  private cheTheiaComponentUpdater: CheTheiaComponentUpdater;

  @inject(DevContainerComponentUpdater)
  private devContainerComponentUpdater: DevContainerComponentUpdater;

  @inject(VsixInstallerComponentUpdater)
  private vsixInstallerComponentUpdater: VsixInstallerComponentUpdater;

  @inject('boolean')
  @named('INSERT_TEMPLATES')
  private insertTemplates: boolean;

  async update(
    devfileContext: DevfileContext,
    cheTheiaExtensions: VSCodeExtensionEntry[],
    extensionsWithSidecars: VSCodeExtensionEntryWithSidecar[],
    extensionsForDevContainer: VSCodeExtensionDevContainer | undefined
  ): Promise<void> {
    if (!devfileContext.devWorkspace.spec?.template) {
      throw new Error('Can update a dev workspace only if there is a template in spec object');
    }

    const components = devfileContext.devWorkspace.spec.template.components || [];
    if (!devfileContext.devWorkspace.spec.template.components) {
      devfileContext.devWorkspace.spec.template.components = components;
    }

    // add the vsix installer
    await this.vsixInstallerComponentUpdater.add(devfileContext);

    // need to add the kubernetes plug-in in the devWorkspace object
    if (this.insertTemplates) {
      devfileContext.devWorkspaceTemplates.map(template => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const name = (template.metadata as any)?.name;
        if (!name) {
          throw new Error(`No name found for the template ${JSON.stringify(template, undefined, 2)}.`);
        }
        components.push({
          name,
          plugin: {
            kubernetes: {
              name,
            },
          },
        });
      });
    }

    // first, update theia component to add the vsix URLS, preferences, etc
    this.cheTheiaComponentUpdater.insert(devfileContext, cheTheiaExtensions);

    // then, generate sidecar components to add (if any)
    const componentsToAdd = await this.sidecarComponentsCreator.create(extensionsWithSidecars);

    // finally, update dev container component with extensions to be deployed there
    if (extensionsForDevContainer) {
      this.devContainerComponentUpdater.insert(devfileContext, extensionsForDevContainer);
    }

    // and add them
    devfileContext.devWorkspace.spec.template.components.push(...componentsToAdd);
  }
}
