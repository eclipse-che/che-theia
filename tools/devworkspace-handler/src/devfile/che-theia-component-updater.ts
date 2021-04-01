/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { inject, injectable } from 'inversify';

import { CheTheiaComponentFinder } from './che-theia-component-finder';
import { DevfileContext } from '../api/devfile-context';
import { VSCodeExtensionEntry } from '../api/vscode-extension-entry';

@injectable()
export class CheTheiaComponentUpdater {
  @inject(CheTheiaComponentFinder)
  private cheTheiaComponentFinder: CheTheiaComponentFinder;

  async insert(devfileContext: DevfileContext, cheTheiaExtensions: VSCodeExtensionEntry[]): Promise<void> {
    // skip stuff if no extensions need to be installed in che-theia component
    if (cheTheiaExtensions.length === 0) {
      return;
    }
    const theiaComponent = await this.cheTheiaComponentFinder.find(devfileContext);

    // add attributes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let attributes: any = theiaComponent.attributes;
    if (!attributes) {
      attributes = {};
      theiaComponent.attributes = attributes;
    }

    // grab list of extensions
    const cheTheiaVsix = cheTheiaExtensions
      .map(extension => extension.extensions)
      .reduce((acc, val) => acc.concat(val), []);

    // grab list of extensions
    const cheTheiaPreferencesArray = cheTheiaExtensions.map(extension => extension.preferences);
    const cheTheiaPreferences = Object.assign({}, ...cheTheiaPreferencesArray);

    attributes['che-theia.eclipse.org/vscode-extensions'] = cheTheiaVsix;

    // add preferences only if there are one
    if (cheTheiaPreferences && Object.keys(cheTheiaPreferences).length > 0) {
      attributes['che-theia.eclipse.org/vscode-preferences'] = cheTheiaPreferences;
    }
  }
}
