/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { CheWorkspaceHostedPluginUriPostProcessor } from './che-workspace-hosted-plugin-uri-post-processor';
import { ContainerModule } from 'inversify';
import { HostedPluginUriPostProcessorSymbolName } from '@theia/plugin-dev';

export default new ContainerModule(bind => {
  bind(Symbol.for(HostedPluginUriPostProcessorSymbolName)).to(CheWorkspaceHostedPluginUriPostProcessor);
});
