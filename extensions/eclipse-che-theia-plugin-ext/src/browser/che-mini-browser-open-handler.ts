/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { MiniBrowserOpenerOptions, MiniBrowserOpenHandler } from '@theia/mini-browser/lib/browser/mini-browser-open-handler';

export class CheMiniBrowserOpenHandler extends MiniBrowserOpenHandler {

    protected async getOpenPreviewProps(startPage: string): Promise<MiniBrowserOpenerOptions> {
        const miniBrowserOpenerOptions = await super.getOpenPreviewProps(startPage);
        return { ...miniBrowserOpenerOptions, toolbar: 'show' };
    }
}
