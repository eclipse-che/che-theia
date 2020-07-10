/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as React from 'react';
import { AboutDialog, AboutDialogProps, ABOUT_CONTENT_CLASS } from '@theia/core/lib/browser/about-dialog';
import { injectable, inject, postConstruct } from 'inversify';
import { CheProductService, Product } from '@eclipse-che/theia-plugin-ext/lib/common/che-protocol';
import { ThemeService, Theme } from '@theia/core/lib/browser/theming';
import { Logo } from '@eclipse-che/plugin';

import '../../src/browser/style/che-theia-about.css';

const jsonDetails = require('../../conf/about-details.json');

@injectable()
export class AboutCheTheiaDialog extends AboutDialog {

    protected productInfo: Product;

    @inject(CheProductService)
    protected productService: CheProductService;

    @inject(ThemeService)
    protected readonly themeService: ThemeService;

    constructor(
        @inject(AboutDialogProps) protected readonly props: AboutDialogProps
    ) {
        super(props);
    }

    @postConstruct()
    protected async init(): Promise<void> {
        this.productInfo = await this.productService.getProduct();
        this.extensionsInfos = await this.appServer.getExtensionsInfos();
        this.update();
        this.titleNode.textContent = this.productInfo.name;
    }

    protected render(): React.ReactNode {
        return <div className={ABOUT_CONTENT_CLASS}>
            {this.renderHeader()}
            {this.renderExtensions()}
            {this.renderTimestamp()}
        </div>;
    }

    protected renderHeader(): React.ReactNode {
        return <div className='che-theia-about-product-header'>
            {this.getLogo()}
            {this.getVersion()}
        </div>;
    }

    protected getLogo(): React.ReactNode {
        const productInfo = this.productInfo;
        let src = '';

        if (typeof productInfo.logo === 'object') {
            const productLogo: Logo = productInfo.logo;
            src = this.isDark(this.themeService.getCurrentTheme()) ? productLogo.dark : productLogo.light;

            this.themeService.onThemeChange(e => {
                src = this.isDark(e.newTheme) ? productLogo.dark : productLogo.light;
            });
        } else {
            src = productInfo.logo;
        }

        return <div className='che-theia-about-product-logo'>
            <img src={src}></img>
        </div>;
    }

    private isDark(theme: Theme): boolean {
        return !theme.id.includes('light');
    }

    protected getVersion(): React.ReactNode {
        const style: React.CSSProperties = {
            margin: '4px',
            textAlign: 'center',
            fontFamily: 'Roboto, sans-serif',
            fontWeight: 400
        };
        const linkStyle: React.CSSProperties = {
            color: 'var(--theia-editorWidget-foreground)'
        };
        return <h4 style={style}>
            Che-Theia@
            <a
                href={`https://github.com/eclipse/che-theia/commit/${jsonDetails.cheTheiaSha1}`}
                target='_blank'
                style={linkStyle}>
                {jsonDetails.cheTheiaSha1}
            </a>
            {' '}using Theia@
            <a
                href={`https://github.com/eclipse-theia/theia/commit/${jsonDetails.theiaSha1}`}
                target='_blank'
                style={linkStyle}>
                {jsonDetails.theiaSha1}
            </a>
        </h4>;
    }

    protected renderTimestamp(): React.ReactNode {
        const style: React.CSSProperties = {
            marginBlockStart: '4px',
            textAlign: 'right',
            fontWeight: 200,
            fontSize: '10px'
        };
        return <h4 style={style}>Built {jsonDetails.date}</h4>;
    }
}
