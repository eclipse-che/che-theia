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

@injectable()
export class CheProductServiceImpl implements CheProductService {

    private product: ProductInfo;

    async getProductInfo(): Promise<ProductInfo> {
        if (this.product) {
            return this.product;
        }

        if (process.env.PRODUCT_JSON) {
            let jsonPath = process.env.PRODUCT_JSON;
            jsonPath = jsonPath.startsWith('/') ? jsonPath : path.join(__dirname, jsonPath);

            try {
                const product: ProductInfo = await fs.readJson(jsonPath) as ProductInfo;
                this.product = {
                    name: product.name,
                    logo: this.getLogo(product.logo, jsonPath),
                    description: product.description,
                    links: product.links
                };

                return this.product;
            } catch (error) {
                console.error(error);
            }
        }

        /**
         * Return defaults
         */
        return {
            name: 'Eclipse Che',
            logo: path.join(__dirname, '/../../src/resource/che-logo.svg'),
            description: 'Welcome To Your Cloud Developer Workspace',
            links: {
                'Documentation': 'https://www.eclipse.org/che/docs/che-7',
                'Community chat': 'https://mattermost.eclipse.org/eclipse/channels/eclipse-che'
            }
        };
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
