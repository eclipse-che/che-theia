/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { injectable } from 'inversify';
import * as che from '@eclipse-che/plugin';
import * as theia from '@theia/plugin';

const EXTERNAL_COMMAND_ID = 'theia.open';
const INTERNAL_COMMAND_ID = 'mini-browser.openUrl';

@injectable()
export class PreviewUrlOpenService {

    /**
     * Open the given URL to preview it in a separate browser's tab.
     * @param url a URL to go to
     */
    async previewExternally(url: string): Promise<void> {
        return this.preview(url, EXTERNAL_COMMAND_ID);
    }

    /**
     * Open the given URL to preview it in the embedded mini-browser.
     * @param url a URL to preview
     */
    async previewInternally(url: string): Promise<void> {
        return this.preview(url, INTERNAL_COMMAND_ID);
    }

    /**
     * Tries to resolve the variable in the given URL.
     * @param previewURL an URL to resolve
     */
    async resolve(previewURL: string): Promise<string | undefined> {
        return che.variables.resolve(previewURL);
    }

    private async preview(url: string, commandId: string): Promise<void> {
        return theia.commands.executeCommand<void>(commandId, url);
    }
}
