/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as theia from '@theia/plugin';

import { parse, readFile } from '../utils';

import { Configurations } from '../export/export-configs-manager';
import { injectable } from 'inversify';

/** Extracts launch configurations from config file by given uri. */
@injectable()
export class ConfigFileLaunchConfigsExtractor {
  async extract(launchConfigFileUri: string): Promise<Configurations<theia.DebugConfiguration>> {
    const configsContent = await readFile(launchConfigFileUri);
    const configsJson = parse(configsContent);
    if (!configsJson || !configsJson.configurations) {
      return { content: '', configs: [] };
    }

    return { content: configsContent, configs: configsJson.configurations };
  }
}
