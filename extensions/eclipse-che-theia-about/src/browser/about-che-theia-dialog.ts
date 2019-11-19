/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as path from 'path';
import { AboutDialog, AboutDialogProps, ABOUT_EXTENSIONS_CLASS, ABOUT_CONTENT_CLASS } from '@theia/core/lib/browser/about-dialog';
import { injectable, inject, postConstruct } from 'inversify';
import { CheProductService, Product } from '@eclipse-che/theia-plugin-ext/lib/common/che-protocol';
import { ThemeService, Theme } from '@theia/core/lib/browser/theming';
import { Logo } from '@eclipse-che/plugin';

import '../../src/browser/style/che-theia-about.css';

const jsonDetails = require('../../conf/about-details.json');

@injectable()
export class AboutCheTheiaDialog extends AboutDialog {

    @inject(CheProductService)
    private productService: CheProductService;

    @inject(ThemeService)
    protected readonly themeService: ThemeService;

    constructor(
        @inject(AboutDialogProps) protected readonly props: AboutDialogProps
    ) {
        // use empty header by default
        super({
            title: ''
        });
    }

    /**
     * Returns suitable URI as a string for the logo image
     */
    protected getLogo(logo: string): string {
        if (logo.startsWith('http://') || logo.startsWith('https://')) {
            // HTTP resource
            return logo;
        }

        if (logo.startsWith('file://')) {
            // file resource
            logo = logo.substring(7);
        }

        // Use relative endpoint path
        return path.join('mini-browser', logo);
    }

    /**
     * Check if theme is dark or not
     */
    private isDark(theme: Theme): boolean {
        const currentThemeId: string = theme.id;
        return !currentThemeId.includes('light');
    }

    /**
     * Returns product header element
     */
    protected async getProductHeader(product: Product): Promise<HTMLElement> {
        const header = document.createElement('div');
        header.setAttribute('class', 'che-theia-about-product-header');

        const logo = document.createElement('div');
        logo.setAttribute('class', 'che-theia-about-product-logo');
        const image = document.createElement('img');

        if (typeof product.logo === 'object') {
            const productLogo: Logo = product.logo as Logo;
            if (this.isDark(this.themeService.getCurrentTheme())) {
                image.setAttribute('src', this.getLogo(productLogo.dark));
            } else {
                image.setAttribute('src', this.getLogo(productLogo.light));
            }

            // listen on events when the theme is changing to update the logo
            this.themeService.onThemeChange(e => {
                if (this.isDark(e.newTheme)) {
                    image.setAttribute('src', this.getLogo(productLogo.dark));
                } else {
                    image.setAttribute('src', this.getLogo(productLogo.light));
                }
            });

        } else {
            image.setAttribute('src', this.getLogo(product.logo));
        }

        logo.appendChild(image);
        header.appendChild(logo);

        return header;
    }

    @postConstruct()
    protected async init(): Promise<void> {
        // Get product info
        const product = await this.productService.getProduct();

        // Set dialog title
        this.titleNode.textContent = product.name;

        const messageNode = document.createElement('div');
        messageNode.classList.add(ABOUT_CONTENT_CLASS);
        messageNode.appendChild(await this.getProductHeader(product));

        // Che-Theia
        const cheTheiaTitle = document.createElement('h4');

        const cheTheiaLink = document.createElement('a');
        cheTheiaLink.setAttribute('href', `https://github.com/eclipse/che-theia/commit/${jsonDetails.cheTheiaSha1}`);
        cheTheiaLink.setAttribute('target', '_blank');
        cheTheiaLink.setAttribute('style', 'color: var(--theia-ui-dialog-font-color);');
        cheTheiaLink.innerHTML = `${jsonDetails.cheTheiaSha1}`;

        const theiaLink = document.createElement('a');
        theiaLink.setAttribute('href', `https://github.com/eclipse-theia/theia/commit/${jsonDetails.theiaSha1}`);
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

}
