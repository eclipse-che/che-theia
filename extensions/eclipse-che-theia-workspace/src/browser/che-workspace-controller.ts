/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { inject, injectable } from 'inversify';
import { CheApiService } from '@eclipse-che/theia-plugin-ext/lib/common/che-protocol';
import { che } from '@eclipse-che/api';
import { AbstractDialog, ConfirmDialog } from '@theia/core/lib/browser';
import { Message } from '@theia/core/lib/browser/widgets';
import { Key } from '@theia/core/lib/browser/keyboard/keys';
import { CheWorkspaceCommands } from './che-workspace-contribution';
import { QuickOpenCheWorkspace } from './che-quick-open-workspace';

export class StopWorkspaceDialog extends AbstractDialog<boolean | undefined> {
    protected confirmed: boolean | undefined = true;
    protected readonly dontStopButton: HTMLButtonElement;

    constructor() {
        super({
            title: 'Open Workspace'
        });

        this.contentNode.appendChild(this.createMessageNode('Do you want to stop current workspace?'));
        this.appendCloseButton('Cancel');
        this.dontStopButton = this.appendDontStopButton();
        this.appendAcceptButton('Yes');
    }

    get value(): boolean | undefined {
        return this.confirmed;
    }

    protected appendDontStopButton(): HTMLButtonElement {
        const button = this.createButton('No');
        this.controlPanel.appendChild(button);
        button.classList.add('secondary');
        return button;
    }

    protected onAfterAttach(msg: Message): void {
        super.onAfterAttach(msg);
        this.addKeyListener(this.dontStopButton, Key.ENTER, () => {
            this.confirmed = false;
            this.accept();
        }, 'click');
    }

    protected onCloseRequest(msg: Message): void {
        super.onCloseRequest(msg);
        this.confirmed = undefined;
        this.accept();
    }

    protected createMessageNode(msg: string | HTMLElement): HTMLElement {
        if (typeof msg === 'string') {
            const messageNode = document.createElement('div');
            messageNode.textContent = msg;
            return messageNode;
        }
        return msg;
    }
}

@injectable()
export class CheWorkspaceController {

    @inject(CheApiService) protected readonly cheApi: CheApiService;
    @inject(QuickOpenCheWorkspace) protected readonly quickOpenWorkspace: QuickOpenCheWorkspace;

    async openWorkspace(): Promise<void> {
        await this.doOpenWorkspace(false);
    }

    async openRecentWorkspace(): Promise<void> {
        await this.doOpenWorkspace(true);
    }

    private doOpenWorkspace(recent: boolean): Promise<void> {
        return this.quickOpenWorkspace.select(recent, async (workspace: che.workspace.Workspace) => {
            const dialog = new StopWorkspaceDialog();
            const result = await dialog.open();
            if (typeof result === 'boolean') {
                if (result) {
                    await this.cheApi.stop();
                }
                window.parent.postMessage(`open-workspace:${workspace.id}`, '*');
            }
        });
    }

    async closeCurrentWorkspace(): Promise<void> {
        const dialog = new ConfirmDialog({
            title: CheWorkspaceCommands.CLOSE_CURRENT_WORKSPACE.label!,
            msg: 'Do you really want to close the workspace?'
        });
        if (await dialog.open()) {
            await this.cheApi.stop();

            window.parent.postMessage('show-workspaces', '*');
        }
    }
}
