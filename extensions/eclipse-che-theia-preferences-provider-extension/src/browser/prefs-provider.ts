/********************************************************************************
 * Copyright (C) 2019 Red Hat, Inc. and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { injectable, inject } from 'inversify';
import {
    PreferenceServiceImpl,
    PreferenceScope,
    FrontendApplicationContribution,
    FrontendApplication
} from '@theia/core/lib/browser';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { WorkspaceService as CheWorkspaceService } from '@eclipse-che/theia-remote-api/lib/common/workspace-service';
import { che } from '@eclipse-che/api';

@injectable()
export class PreferencesProvider implements FrontendApplicationContribution {

    @inject(CheWorkspaceService)
    private devWorkspaceService: CheWorkspaceService;

    constructor(
        @inject(PreferenceServiceImpl) private readonly preferenceService: PreferenceServiceImpl,
        @inject(WorkspaceService) private readonly workspaceService: WorkspaceService,
    ) { }

    private getPluginsProperties(workspace: che.workspace.Workspace): [string, string][] {
        if (!!workspace.devfile) {
            return this.getPropsFromDevfile(workspace);
        } else if (!!workspace.config) {
            return this.getPropsFromConfig(workspace);
        }
        throw new TypeError('Can\'t get either "config" or "devfile" of current workspace configuration.');
    }

    private getPropsFromConfig(workspace: che.workspace.Workspace): [string, string][] {
        const attributes = workspace.config!.attributes;
        if (!attributes) {
            return [];
        }

        return Object.keys(attributes)
            .filter((attrKey: string) => attrKey.indexOf('plugin.') === 0 && attrKey.indexOf('.preference.') !== -1)
            .map((attrKey: string) => <[string, string]>[attrKey.split('.preference.')[1], attributes[attrKey]]);
    }

    private getPropsFromDevfile(workspace: che.workspace.Workspace): [string, string][] {
        const components = workspace.devfile!.components;
        if (!components) {
            throw new TypeError('Can\'t get "components" of current workspace "devfile" section.');
        }

        return components
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((component: che.workspace.devfile.Component) => (<any>component).preferences)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((component: che.workspace.devfile.Component) => (<any>component).preferences)
            .reduce((result: [string, string][], preferences: { [key: string]: string }) => {
                Object.keys(preferences).forEach(key => {
                    result.push(<[string, string]>[key, preferences[key]]);
                });
                return result;
            }, []);
    }

    private async setPluginProperties(props: [string, string][]): Promise<void> {
        await this.workspaceService.roots;
        for (const [key, value] of props) {

            try {
                this.setPreferenceValue(key, JSON.parse(value));
            } catch (error) {
                console.warn('could not parse value for preference key %s, using string value: %o', key, error);
                this.setPreferenceValue(key, value);
            }
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async setPreferenceValue(key: string, value: any): Promise<void> {
        if (!this.preferenceService.has(key)) {
            await this.preferenceService.set(key, value, PreferenceScope.Workspace);
        }
    }

    async restorePluginProperties(): Promise<void> {
        const workspace = await this.devWorkspaceService.currentWorkspace();
        const propsTuples = this.getPluginsProperties(workspace);
        return this.setPluginProperties(propsTuples);
    }

    onStart(_app: FrontendApplication): Promise<void> {
        return this.restorePluginProperties();
    }

}
