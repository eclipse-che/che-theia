/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as axios from 'axios';

import { Generate } from './generate';
import { InversifyBinding } from './inversify/inversify-binding';
import { SidecarPolicy } from './api/devfile-context';

export class Main {
  protected async doStart(): Promise<void> {
    let devfileUrl: string | undefined;
    let outputFile: string | undefined;
    let pluginRegistryUrl: string | undefined;
    let editor: string | undefined;
    let sidecarPolicy: SidecarPolicy | undefined;
    const args = process.argv.slice(2);
    args.forEach(arg => {
      if (arg.startsWith('--devfile-url:')) {
        devfileUrl = arg.substring('--devfile-url:'.length);
      }
      if (arg.startsWith('--plugin-registry-url:')) {
        pluginRegistryUrl = arg.substring('--plugin-registry-url:'.length);
      }
      if (arg.startsWith('--editor:')) {
        editor = arg.substring('--editor:'.length);
      }
      if (arg.startsWith('--output-file:')) {
        outputFile = arg.substring('--output-file:'.length);
      }
      if (arg.startsWith('--sidecar-policy:')) {
        const policy = arg.substring('--sidecar-policy:'.length);
        if (policy === SidecarPolicy.MERGE_IMAGE.toString()) {
          sidecarPolicy = SidecarPolicy.MERGE_IMAGE;
        } else if (policy === SidecarPolicy.USE_DEV_CONTAINER.toString()) {
          sidecarPolicy = SidecarPolicy.USE_DEV_CONTAINER;
        } else {
          throw new Error(
            `${policy} is not a valid sidecar policy. Available values are ${Object.values(SidecarPolicy)}`
          );
        }
      }
    });
    if (!pluginRegistryUrl) {
      pluginRegistryUrl = 'https://eclipse-che.github.io/che-plugin-registry/main/v3';
      console.log(`No plug-in registry url. Setting to ${pluginRegistryUrl}`);
    }
    if (!editor) {
      editor = 'eclipse/che-theia/next';
      console.log(`No editor. Setting to ${editor}`);
    }
    if (!sidecarPolicy) {
      sidecarPolicy = SidecarPolicy.USE_DEV_CONTAINER;
      console.log(`No sidecar policy. Setting to ${sidecarPolicy}`);
    }
    if (!devfileUrl) {
      throw new Error('missing --devfile-url: parameter');
    }
    if (!outputFile) {
      throw new Error('missing --output-file: parameter');
    }

    const axiosInstance = axios.default;
    const inversifyBinbding = new InversifyBinding();
    const container = await inversifyBinbding.initBindings({
      pluginRegistryUrl,
      insertTemplates: true,
      axiosInstance,
    });
    container.bind(Generate).toSelf().inSingletonScope();

    const generate = container.get(Generate);
    return generate.generate(devfileUrl, editor, sidecarPolicy, outputFile);
  }

  async start(): Promise<boolean> {
    try {
      await this.doStart();
      return true;
    } catch (error) {
      console.error('stack=' + error.stack);
      console.error('Unable to start', error);
      return false;
    }
  }
}
