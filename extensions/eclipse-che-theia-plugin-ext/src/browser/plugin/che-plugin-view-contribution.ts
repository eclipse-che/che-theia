/********************************************************************************
 * Copyright (C) 2019 Red Hat, Inc. and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { injectable } from 'inversify';
import { AbstractViewContribution } from '@theia/core/lib/browser/shell/view-contribution';
import { ChePluginWidget } from './che-plugin-widget';

@injectable()
export class ChePluginViewContribution extends AbstractViewContribution<ChePluginWidget> {

    public static PLUGINS_WIDGET_ID = 'che-plugins';

    constructor() {
        super({
            widgetId: ChePluginViewContribution.PLUGINS_WIDGET_ID,
            widgetName: 'Che Plugins',
            defaultWidgetOptions: {
                area: 'left',
                rank: 400
            },
            toggleCommandId: 'chePluginsView:toggle',
            toggleKeybinding: 'ctrlcmd+shift+j'
        });
    }

}
