/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { AbstractViewContribution } from '@theia/core/lib/browser/shell/view-contribution';
import { ChePluginView } from './che-plugin-view';
import { injectable } from 'inversify';

@injectable()
export class ChePluginViewContribution extends AbstractViewContribution<ChePluginView> {
  public static PLUGINS_WIDGET_ID = 'che-plugins';

  constructor() {
    super({
      widgetId: ChePluginViewContribution.PLUGINS_WIDGET_ID,
      widgetName: 'Plugins',
      defaultWidgetOptions: {
        area: 'left',
        rank: 400,
      },
      toggleCommandId: 'chePluginsView:toggle',
      toggleKeybinding: 'ctrlcmd+shift+j',
    });
  }
}
