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
     * Method also tries to resolve the variables in the given URL.
     * @param previewURL a URL to go to
     */
    async previewExternally(previewURL: string): Promise<void> {
        return this.preview(previewURL, EXTERNAL_COMMAND_ID);
    }

    /**
     * Open the given URL to preview it in the embedded mini-browser.
     * Method also tries to resolve the variables in the given URL.
     * @param previewURL a URL to preview
     */
    async previewInternally(previewURL: string): Promise<void> {
        return this.preview(previewURL, INTERNAL_COMMAND_ID);
    }

    /**
     * Tries to resolve the variable in the given URL.
     * @param previewURL an URL to resolve
     */
    async resolve(previewURL: string): Promise<string> {
        return await che.variables.resolve(previewURL);
    }

    private async preview(previewURL: string, commandId: string): Promise<void> {
        const url = await this.resolve(previewURL);
        return theia.commands.executeCommand<void>(commandId, url);
    }
}
