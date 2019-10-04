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
// const PRODUCT_JSON = 'product.json';

@injectable()
export class CheProductServiceImpl implements CheProductService {

    async getProductInfo(): Promise<ProductInfo> {
        const productJsonPath = this.jsonFilePath();

        try {
            const product: ProductInfo = await fs.readJson(productJsonPath) as ProductInfo;
            const logo = this.getLogo(product, productJsonPath);
            return {
                name: product.name,
                logo: logo,
                description: product.description,
                links: product.links
            };
        } catch (error) {
            console.error(error);
        }

        return {
            name: '',
            logo: '',
            description: '',
            links: {}
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
    getLogo(product: ProductInfo, productJsonPath: string): string {
        const logo = product.logo;

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
