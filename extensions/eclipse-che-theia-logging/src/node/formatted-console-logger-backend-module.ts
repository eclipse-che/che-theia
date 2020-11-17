/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { ContainerModule } from 'inversify';
import { FormattedConsoleLoggerServer } from './formatted-console-logger-server';
import { ILoggerServer } from '@theia/core/lib/common/logger-protocol';

export default new ContainerModule((bind, unbind, isBound, rebind) => {
  rebind(ILoggerServer).to(FormattedConsoleLoggerServer).inSingletonScope();
});
