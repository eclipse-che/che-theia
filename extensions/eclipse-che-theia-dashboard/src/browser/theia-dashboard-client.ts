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
import { FrontendApplicationStateService } from '@theia/core/lib/browser/frontend-application-state';
import { WorkspaceService } from '@eclipse-che/theia-remote-api/lib/common/workspace-service';
import '../../src/browser/style/che-theia-dashboard-module.css';

const THEIA_ICON_ID = 'theia:icon';

/**
 * Provides basic Eclipse Che Theia Dashboard extension that adds Show/Hide Dashboard button to the top menu.
 */
@injectable()
export class TheiaDashboardClient implements FrontendApplicationContribution {

    private isExpanded: boolean = false;

    @inject(WorkspaceService)
    private workspaceService: WorkspaceService;

    constructor(
        @inject(FrontendApplicationStateService) protected readonly frontendApplicationStateService: FrontendApplicationStateService,
    ) {
        this.frontendApplicationStateService.reachedState('ready').then(() => this.onReady());
    }

    async onStart(app: FrontendApplication): Promise<void> {
        // load this module at FrontendApplication startup
    }

    async onReady(): Promise<void> {
        const logoEl: HTMLElement | null = document.getElementById(THEIA_ICON_ID);
        if (!logoEl || !logoEl.parentElement) {
            return;
        }

        const isInFrame = window !== window.parent;
        const dashboardEl: HTMLElement = document.createElement('div');
        dashboardEl.className = 'che-dashboard';
        const arrowEl: HTMLElement = document.createElement(isInFrame ? 'i' : 'a');
        arrowEl.className = 'fa fa-chevron-left';
        logoEl.parentElement.replaceChild(dashboardEl, logoEl);

        if (isInFrame) {
            arrowEl.setAttribute('title', 'Hide navigation bar');
            arrowEl.addEventListener('click', () => this.expandIde(arrowEl));
            this.expandIde(arrowEl);
        } else {
            this.isExpanded = true;

            arrowEl.setAttribute('target', '_blank');
            const href = await this.getDashboardIdeUrl();
            if (href === undefined) {
                return;
            }
            arrowEl.setAttribute('href', href);
            arrowEl.className = `fa fa-chevron-${this.isExpanded ? 'right' : 'left'}`;
            arrowEl.title = 'Open with navigation bar';
        }

        dashboardEl.appendChild(arrowEl);
    }

    private expandIde(arrowEl: HTMLElement): void {
        this.isExpanded = !this.isExpanded;
        window.parent.postMessage(this.isExpanded ? 'hide-navbar' : 'show-navbar', '*');
        arrowEl.className = `fa fa-chevron-${this.isExpanded ? 'right' : 'left'}`;
        arrowEl.title = `${this.isExpanded ? 'Show' : 'Hide'} navigation bar`;
    }

    async getIdeUrl(): Promise<string | undefined> {
        const workspace = await this.workspaceService.currentWorkspace();

        if (workspace && workspace.links && workspace.links.ide) {
            return workspace.links.ide;
        }
    }

    async getDashboardIdeUrl(): Promise<string | undefined> {
        const url = await this.getIdeUrl();
        if (!url) {
            return;
        }
        return url.replace(/^https?:\/\/[^\/]+/, match => `${match}/dashboard/#/ide`);
    }
}
