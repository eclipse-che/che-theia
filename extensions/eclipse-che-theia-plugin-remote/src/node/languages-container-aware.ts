/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as theia from '@theia/plugin';
import { LanguagesExtImpl } from '@theia/plugin-ext/lib/plugin/languages';
import { overrideUri } from './che-content-aware-utils';

export class LanguagesContainerAware {

    static makeLanguagesContainerAware(languagesExt: LanguagesExtImpl): void {
        const languagesContainerAware = new LanguagesContainerAware();
        languagesContainerAware.overrideDefinitionProvider(languagesExt);
    }

    overrideDefinitionProvider(languagesExt: LanguagesExtImpl): void {
        const originalRegisterDefinitionProvider = languagesExt.registerDefinitionProvider.bind(languagesExt);
        const registerDefinitionProvider = (selector: theia.DocumentSelector, provider: theia.DefinitionProvider) =>
            originalRegisterDefinitionProvider(selector, {
                provideDefinition: async (
                    document: theia.TextDocument,
                    position: theia.Position,
                    token: theia.CancellationToken | undefined
                ): Promise<theia.Definition | theia.DefinitionLink[]> => {

                    const result = await provider.provideDefinition(document, position, token);
                    if (!result) {
                        return [];
                    }

                    if (Array.isArray(result)) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (result as any[]).forEach(value => this.overrideResult(value));
                    } else {
                        this.overrideResult(result);
                    }

                    return result;
                }
            });

        languagesExt.registerDefinitionProvider = registerDefinitionProvider;
    }

    overrideResult(reference: theia.Location | theia.DefinitionLink): void {
        if ('uri' in reference) {
            reference.uri = overrideUri(reference.uri);
        } else {
            reference.targetUri = overrideUri(reference.targetUri);
        }
    }
}
