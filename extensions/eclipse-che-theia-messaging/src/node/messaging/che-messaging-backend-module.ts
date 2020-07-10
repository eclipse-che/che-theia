/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { ContainerModule } from 'inversify';
import { MessagingService } from '@theia/core/lib/node';
import { MessagingContribution } from '@theia/core/lib/node/messaging/messaging-contribution';
import { CheMessagingContribution } from './che-messaging-contribution';

export default new ContainerModule((bind, unbind, isBound, rebind) => {
    bind(CheMessagingContribution).toSelf().inSingletonScope();
    rebind<MessagingContribution>(MessagingService.Identifier).toService(CheMessagingContribution);
});
