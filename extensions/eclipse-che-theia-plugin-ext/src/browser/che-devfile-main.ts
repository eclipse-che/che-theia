/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { interfaces } from 'inversify';
import { CheDevfileMain, CheApiService } from '../common/che-protocol';
import { isNative, AbstractDialog } from '@theia/core/lib/browser';
import { WindowService } from '@theia/core/lib/browser/window/window-service';
import { MessageService } from '@theia/core';

export class CheDevfileMainImpl implements CheDevfileMain {

    private readonly cheApiService: CheApiService;

    private readonly windowService: WindowService;

    private readonly messageService: MessageService;

    private readonly openFactoryLinkDialog: OpenFactoryLinkDialog;

    constructor(container: interfaces.Container) {
        this.cheApiService = container.get(CheApiService);
        this.windowService = container.get(WindowService);
        this.messageService = container.get(MessageService);

        this.openFactoryLinkDialog = new OpenFactoryLinkDialog(this.windowService);
    }

    async $createWorkspace(devfilePath: string): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            let baseURI = await this.cheApiService.getCheApiURI();

            if (!baseURI) {
                this.messageService.error('Che API URI is not set!');
                reject('Che API URI is not set!');
                return;
            }

            if (baseURI.endsWith('/api')) {
                baseURI = baseURI.substring(0, baseURI.length - 4);
            }

            const fileDownloadURI = window.location.origin + '/files/?uri=' + devfilePath;
            const factoryURI = `${baseURI}/f?url=${fileDownloadURI}`;

            this.openFactoryWindow(factoryURI);

            resolve();
        });
    }

    /**
     * Opens window with URL to the factory.
     */
    protected async openFactoryWindow(uri: string): Promise<void> {
        // do nothing for electron browser
        if (isNative) {
            return;
        }

        if (uri) {
            try {
                this.windowService.openNewWindow(uri);
            } catch (err) {
                // browser blocked opening of a new tab
                this.openFactoryLinkDialog.showOpenNewTabAskDialog(uri);
            }
        }
    }

}

class OpenFactoryLinkDialog extends AbstractDialog<string> {

    protected readonly windowService: WindowService;
    protected readonly openButton: HTMLButtonElement;
    protected readonly messageNode: HTMLDivElement;
    protected readonly linkNode: HTMLAnchorElement;

    value: string;

    constructor(windowService: WindowService) {
        super({
            title: 'Your browser prevented opening of a new tab'
        });

        this.windowService = windowService;

        this.linkNode = document.createElement('a');
        this.linkNode.target = '_blank';
        this.linkNode.setAttribute('style', 'color: var(--theia-ui-dialog-font-color);');
        this.contentNode.appendChild(this.linkNode);

        const messageNode = document.createElement('div');
        messageNode.innerText = 'URI to create a workspace: ';
        messageNode.appendChild(this.linkNode);
        this.contentNode.appendChild(messageNode);

        this.appendCloseButton();
        this.openButton = this.appendAcceptButton('Open');
    }

    showOpenNewTabAskDialog(uri: string): void {
        this.value = uri;

        this.linkNode.innerHTML = uri;
        this.linkNode.href = uri;
        this.openButton.onclick = () => {
            this.windowService.openNewWindow(uri);
        };

        this.open();
    }

}
