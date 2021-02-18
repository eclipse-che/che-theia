/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { BrowserRemoteHostedPluginSupport } from './browser-remote-hosted-plugin-support';
import { ChePluginFileServiceContribution } from './resource-file-system';
import { ChePluginResourceResolver } from './che-plugin-resource';
import { ContainerModule } from 'inversify';
import { FileServiceContribution } from '@theia/filesystem/lib/browser/file-service';
import { HostedPluginSupport } from '@theia/plugin-ext/lib/hosted/browser/hosted-plugin';
import { ResourceResolver } from '@theia/core/lib/common/resource';

export default new ContainerModule((bind, unbind, isBound, rebind) => {
  bind(BrowserRemoteHostedPluginSupport).toSelf().inSingletonScope();
  rebind(HostedPluginSupport).toService(BrowserRemoteHostedPluginSupport);
  bind(ChePluginResourceResolver).toSelf().inSingletonScope();
  bind(ResourceResolver).toService(ChePluginResourceResolver);
  bind(ChePluginFileServiceContribution).toSelf().inSingletonScope();
  bind(FileServiceContribution).toService(ChePluginFileServiceContribution);
});
