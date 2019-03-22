/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { injectable, inject } from 'inversify';
import { FrontendApplicationContribution, FrontendApplication } from '@theia/core/lib/browser';
import { EnvVariablesServer, EnvVariable } from '@theia/core/lib/common/env-variables';
import { FrontendApplicationStateService } from '@theia/core/lib/browser/frontend-application-state';
import { CheWorkspaceClientService } from './che-workspace-client-service';
import { che } from '@eclipse-che/api';
import '../../src/browser/style/che-theia-dashboard-module.css';

const THEIA_ICON_ID = 'theia:icon';

/**
 * Provides basic Eclipse Che Theia Dashboard extension that adds Show/Hide Dashboard button to the top menu.
 */
@injectable()
export class TheiaDashboardClient implements FrontendApplicationContribution {

    private isExpanded: boolean = false;

    constructor(@inject(EnvVariablesServer) private readonly envVariablesServer: EnvVariablesServer,
        @inject(CheWorkspaceClientService) private readonly cheWorkspaceClient: CheWorkspaceClientService,
        @inject(FrontendApplicationStateService) protected readonly frontendApplicationStateService: FrontendApplicationStateService) {
        this.frontendApplicationStateService.reachedState('ready').then(() => this.onReady());
    }

    async onStart(app: FrontendApplication): Promise<void> {
        // load this module at FrontendApplication startup
    }

    async onReady() {
        const logoEl: HTMLElement | null = document.getElementById(THEIA_ICON_ID);
        if (!logoEl || !logoEl.parentElement) {
            return;
        }

        const isInFrame = window !== window.parent;
        const dashboardEl: HTMLElement = document.createElement('div');
        dashboardEl.className = 'che-dashboard';
        const arrowEl: HTMLElement = document.createElement(isInFrame ? 'i' : 'a');
        arrowEl.className = 'fa fa-chevron-left';
        dashboardEl.appendChild(arrowEl);
        logoEl!.parentElement!.replaceChild(dashboardEl, logoEl!);

        if (!isInFrame) {
            arrowEl.setAttribute('target', '_blank');
            const href = await this.getDashboardWorkspaceUrl();
            if (href === undefined) {
                return;
            }
            arrowEl.setAttribute('href', href!);
            arrowEl.title = 'Open with navigation bar';

            return;
        }

        arrowEl.setAttribute('title', 'Hide navigation bar');
        arrowEl.addEventListener('click', () => {
            this.isExpanded = !this.isExpanded;
            window.parent.postMessage(this.isExpanded ? 'hide-navbar' : 'show-navbar', '*');
            arrowEl.className = `fa fa-chevron-${this.isExpanded ? 'right' : 'left'}`;
            arrowEl.title = `${this.isExpanded ? 'Show' : 'Hide'} navigation bar`;
        });
    }

    async getDashboardWorkspaceUrl(): Promise<string | undefined> {
        const envVariables: EnvVariable[] = await this.envVariablesServer.getVariables();
        if (!envVariables) {
            return undefined;
        }
        const workspaceIdEnvVar = envVariables.find(envVariable =>
            envVariable.name === 'CHE_WORKSPACE_ID');
        if (!workspaceIdEnvVar || !workspaceIdEnvVar.value) {
            return undefined;
        }

        const workspaceId = workspaceIdEnvVar.value;

        const remoteApi = await this.cheWorkspaceClient.restClient();
        const workspace: che.workspace.Workspace = await remoteApi.getById<che.workspace.Workspace>(workspaceId);

        if (!workspace || !workspace.links || !workspace.links.ide) {
            return undefined;
        }
        const ideWorkspaceUrl = workspace!.links!.ide!;

        return ideWorkspaceUrl.replace('/che/', '/dashboard/#/ide/che/');
    }

}
