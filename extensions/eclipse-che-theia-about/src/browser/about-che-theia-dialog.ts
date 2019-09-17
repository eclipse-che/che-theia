/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { AboutDialog, AboutDialogProps, ABOUT_EXTENSIONS_CLASS, ABOUT_CONTENT_CLASS } from '@theia/core/lib/browser/about-dialog';
import { injectable, inject, postConstruct } from 'inversify';
import { ThemeService, Theme } from '@theia/core/lib/browser/theming';
const logoDark = require('../../src/browser/style/che-logo-dark.svg');
const logoLight = require('../../src/browser/style/che-logo-light.svg');
const jsonDetails = require('../../conf/about-details.json');

@injectable()
export class AboutCheTheiaDialog extends AboutDialog {

    @inject(ThemeService)
    protected readonly themeService: ThemeService;

    constructor(
        @inject(AboutDialogProps) protected readonly props: AboutDialogProps
    ) {
        super(props);
    }

    @postConstruct()
    protected async init(): Promise<void> {
        const messageNode = document.createElement('div');
        messageNode.classList.add(ABOUT_CONTENT_CLASS);
        const imgObject = document.createElement('img');

        if (this.isDark(this.themeService.getCurrentTheme())) {
            imgObject.src = logoDark;
        } else {
            imgObject.src = logoLight;
        }

        // listen on events when the theme is changing to update the logo
        this.themeService.onThemeChange(e => {
            if (this.isDark(e.newTheme)) {
                imgObject.src = logoDark;
            } else {
                imgObject.src = logoLight;
            }

        });

        messageNode.appendChild(imgObject);

        // Che-Theia
        const cheTheiaTitle = document.createElement('h4');

        const cheTheiaLink = document.createElement('a');
        cheTheiaLink.setAttribute('href', `https://github.com/eclipse/che-theia/commit/${jsonDetails.cheTheiaSha1}`);
        cheTheiaLink.setAttribute('target', '_blank');
        cheTheiaLink.setAttribute('style', 'color: var(--theia-ui-dialog-font-color);');
        cheTheiaLink.innerHTML = `${jsonDetails.cheTheiaSha1}`;

        const theiaLink = document.createElement('a');
        theiaLink.setAttribute('href', `https://github.com/theia-ide/theia/commit/${jsonDetails.theiaSha1}`);
        theiaLink.setAttribute('target', '_blank');
        theiaLink.setAttribute('style', 'color: var(--theia-ui-dialog-font-color);');
        theiaLink.innerHTML = `${jsonDetails.theiaSha1}`;

        cheTheiaTitle.appendChild(document.createTextNode('Che-Theia@'));
        cheTheiaTitle.appendChild(cheTheiaLink);
        cheTheiaTitle.appendChild(document.createTextNode(' using Theia@'));
        cheTheiaTitle.appendChild(theiaLink);
        cheTheiaTitle.setAttribute('style', 'margin: 4px; text-align: center; font-family: Roboto, sans-serif; font-weight: 400');
        messageNode.appendChild(cheTheiaTitle);

        const extensionInfoTitle = document.createElement('h3');
        extensionInfoTitle.textContent = 'List of extensions:';
        extensionInfoTitle.setAttribute('style', 'margin-bottom: 4px');
        messageNode.appendChild(extensionInfoTitle);

        const extensionInfoContent = document.createElement('ul');
        extensionInfoContent.setAttribute('style', 'height: 120px; margin-left: 10px; margin-top: 0px;');
        extensionInfoContent.classList.add(ABOUT_EXTENSIONS_CLASS);
        messageNode.appendChild(extensionInfoContent);

        const extensionsInfos = await this.appServer.getExtensionsInfos();

        extensionsInfos.forEach(extension => {
            const extensionInfo = document.createElement('li');
            extensionInfo.textContent = extension.name + ' ' + extension.version;
            extensionInfoContent.appendChild(extensionInfo);
        });
        messageNode.setAttribute('style', 'flex: 1 100%; padding-bottom: calc(var(--theia-ui-padding)*3);');
        this.contentNode.appendChild(messageNode);

        const date = document.createElement('h4');
        date.setAttribute('style', 'margin-block-start: 4px; text-align: right; font-weight: 200; font-size: 10px;');
        date.textContent = `Built ${jsonDetails.date}`;
        messageNode.appendChild(date);
        this.appendAcceptButton('Ok');
    }

    /**
     * Check if theme is dark or not
     */
    private isDark(theme: Theme): boolean {
        const currentThemeId: string = theme.id;
        return !currentThemeId.includes('light');
    }

}
