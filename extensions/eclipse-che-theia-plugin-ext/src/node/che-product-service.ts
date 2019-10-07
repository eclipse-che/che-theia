/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { injectable } from 'inversify';
import { CheProductService, ProductInfo } from '../common/che-protocol';
import * as path from 'path';
import * as fs from 'fs-extra';

const PRODUCT_JSON = '../../src/resource/product.json';

@injectable()
export class CheProductServiceImpl implements CheProductService {

    private product: ProductInfo;

    async getProductInfo(): Promise<ProductInfo> {
        if (this.product) {
            return this.product;
        }

        const productJsonPath = this.jsonFilePath();

        try {
            const product: ProductInfo = await fs.readJson(productJsonPath) as ProductInfo;
            const logo = this.getLogo(product.logo, productJsonPath);
            this.product = {
                name: product.name,
                logo: logo,
                description: product.description,
                links: product.links
            };

            return this.product;
        } catch (error) {
            console.error(error);
        }

        /**
         * Return defaults
         */
        return {
            name: 'Eclipse Che',
            logo: this.getLogo('che-logo.svg', './'),
            description: 'Welcome To Your Cloud Developer Workspace',
            links: {
                'Documentation': 'https://www.eclipse.org/che/docs/che-7',
                'Community chat': 'https://mattermost.eclipse.org/eclipse/channels/eclipse-che'
            }
        };
    }

    /**
     * Returns path to Product JSON file.
     */
    jsonFilePath(): string {
        let productJson = process.env.PRODUCT_JSON ? process.env.PRODUCT_JSON : PRODUCT_JSON;
        productJson = productJson.startsWith('/') ? productJson : path.join(__dirname, productJson);
        return productJson;
    }

    /**
     * Returns string URI to Product Logo.
     */
    getLogo(logo: string, productJsonPath: string): string {
        if (logo.startsWith('http://') || logo.startsWith('https://')) {
            // HTTP resource
            return logo;
        } else if (logo.startsWith('/')) {
            // absolute path
            return `file://${logo}`;
        } else {
            // relative path
            const productJsonDir = path.dirname(productJsonPath);
            return 'file://' + path.join(productJsonDir, logo);
        }
    }

}
