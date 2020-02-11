/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as express from 'express';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { injectable } from 'inversify';

@injectable()
export class CheClientIpServiceContribution implements BackendApplicationContribution {

    configure(app: express.Application): void {
        app.get('/che/client-ip', (req, res) => {
            let clientIp = req.connection.remoteAddress;
            if (!clientIp) {
                clientIp = 'not defined';
            }
            res.send(clientIp);
        });
    }
}
