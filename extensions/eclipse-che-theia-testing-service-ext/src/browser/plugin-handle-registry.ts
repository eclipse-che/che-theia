/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { injectable } from 'inversify';
import { LanguageServerAction } from './languages-test-main';
import { LanguagesExt } from '@theia/plugin-ext';
import { Emitter } from '@theia/core/lib/common/event';

export interface LanguageFeatureRegistration {
    languagesExtImpl: LanguagesExt; // The languagesExt that registered this plugin in the registry
    providerHandles: Map<LanguageServerAction, number>; // A map of language actions to their handle
}

export interface LanguagesExtHandle {
    handle: number;
    languagesExt: LanguagesExt;
}

export interface LanguageRegistrationEvent extends LanguagesExtHandle {
    pluginID: string;
    action: LanguageServerAction;
}

/**
 * This class keeps a registry of which plugins map to which handle
 */
@injectable()
export class PluginHandleRegistry {
    pluginRegistrationMap: Map<string, LanguageFeatureRegistration> = new Map();

    private onRegisteredLanguageFeatureEmitter = new Emitter<LanguageRegistrationEvent>();
    private onRegisteredLanguageFeature = this.onRegisteredLanguageFeatureEmitter.event;

    private findRegisteredLanguagesExt(pluginID: string, languageServerAction: string): LanguagesExtHandle | undefined {
        const languageFeatureRegistration = this.pluginRegistrationMap.get(pluginID);
        if (languageFeatureRegistration) {
            const correctLanguagesExt = languageFeatureRegistration.languagesExtImpl;
            const correctLanguageServerHandle = languageFeatureRegistration.providerHandles.get(languageServerAction);
            if (correctLanguageServerHandle) {
                return {
                    handle: correctLanguageServerHandle,
                    languagesExt: correctLanguagesExt
                };
            }
        }
        return undefined;
    }

    lookupLanguagesExtForPluginAndAction(pluginID: string, languageServerAction: LanguageServerAction): Promise<LanguagesExtHandle> {
        const registeredLanguagesExt = this.findRegisteredLanguagesExt(pluginID, languageServerAction);
        if (!registeredLanguagesExt) {
            return new Promise(resolve => {
                this.onRegisteredLanguageFeature(newRegistration => {
                    if (newRegistration.pluginID === pluginID && newRegistration.action === languageServerAction) {
                        return resolve(newRegistration);
                    }
                });
            });
        } else {
            return Promise.resolve(registeredLanguagesExt);
        }
    }

    registerPluginWithFeatureHandle(handle: number, extensionId: string, newlyRegisteredAction: string, languagesExtProxy: LanguagesExt): void {
        let potentialRegistration = this.pluginRegistrationMap.get(extensionId);
        if (!potentialRegistration) {
            potentialRegistration = {
                providerHandles: new Map(),
                languagesExtImpl: languagesExtProxy
            };
            this.pluginRegistrationMap.set(extensionId, potentialRegistration);
        }
        potentialRegistration.providerHandles.set(newlyRegisteredAction, handle);

        this.onRegisteredLanguageFeatureEmitter.fire({
            handle,
            languagesExt: languagesExtProxy,
            pluginID: extensionId,
            action: newlyRegisteredAction
        });
    }

}
