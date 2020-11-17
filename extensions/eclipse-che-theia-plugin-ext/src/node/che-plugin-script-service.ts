/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as express from 'express';
import * as path from 'path';

import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { injectable } from 'inversify';

const pluginPath = path.resolve(__dirname, '../../lib/webworker');

@injectable()
export class ChePluginApiContribution implements BackendApplicationContribution {
  configure(app: express.Application): void {
    app.get('/che/api/:path(*)', (req, res) => {
      const filePath: string = req.params.path;
      res.sendFile(path.resolve(pluginPath, filePath));
    });
  }
}
