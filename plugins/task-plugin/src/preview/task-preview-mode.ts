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

import { injectable } from 'inversify';

const CHE_CONFIGURATION = 'che';
const TASK_PREVIEW_NOTIFICATIONS = 'task.preview.notifications';

export enum PreviewMode {
  On = 'on',
  AlwaysPreview = 'alwaysPreview',
  AlwaysGoTo = 'alwaysGoTo',
  Off = 'off',
}

@injectable()
export class CheTaskPreviewMode {
  get(): PreviewMode {
    const configuration = theia.workspace.getConfiguration(CHE_CONFIGURATION);
    if (!configuration) {
      return PreviewMode.On;
    }

    const preference = configuration.get(TASK_PREVIEW_NOTIFICATIONS);
    switch (preference) {
      case 'alwaysPreview':
        return PreviewMode.AlwaysPreview;
      case 'alwaysGoTo':
        return PreviewMode.AlwaysGoTo;
      case 'off':
        return PreviewMode.Off;
      default:
        return PreviewMode.On;
    }
  }
}
