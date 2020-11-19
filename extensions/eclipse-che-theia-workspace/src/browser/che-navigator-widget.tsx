/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as React from 'react';

import { injectable } from 'inversify';

import { FileNavigatorWidget } from '@theia/navigator/lib/browser/navigator-widget';

@injectable()
export class CheFileNavigatorWidget extends FileNavigatorWidget {
  protected renderEmptyMultiRootWorkspace(): React.ReactNode {
    return (
      <div className="theia-navigator-container">
        <div className="center">No projects in the workspace yet</div>
      </div>
    );
  }
}
