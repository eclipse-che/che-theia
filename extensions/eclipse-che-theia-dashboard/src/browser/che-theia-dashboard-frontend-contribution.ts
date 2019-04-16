/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { inject, injectable } from 'inversify';
import {
    Command,
    CommandContribution,
    CommandRegistry,
    MenuContribution,
    MenuModelRegistry
} from '@theia/core/lib/common';
import { CommonMenus } from '@theia/core/lib/browser';
import { TheiaDashboardClient } from './theia-dashboard-client';

const SHARE: Command = {
    id: 'workspace:share',
    label: 'Share'
};

@injectable()
export class CheTheiaDashboardFrontendContribution implements CommandContribution, MenuContribution {

    @inject(TheiaDashboardClient)
    protected readonly dashboardClient: TheiaDashboardClient;

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(SHARE, {
            execute: () => this.dashboardClient.openDashboardWorkspacePage()
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        const downloadUploadMenu = [...CommonMenus.FILE, '4_downloadupload'];
        menus.registerMenuAction(downloadUploadMenu, {
            commandId: SHARE.id,
            order: 'c'
        });
    }

}
