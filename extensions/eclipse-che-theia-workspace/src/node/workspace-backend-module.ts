/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { CheWorkspaceServer } from './che-workspace-server';
import { ContainerModule } from 'inversify';
import { WorkspaceServer } from '@theia/workspace/lib/common';

export default new ContainerModule((bind, unbind, isBound, rebind) => {
  bind(CheWorkspaceServer).toSelf().inSingletonScope();
  rebind(WorkspaceServer).toService(CheWorkspaceServer);
});
