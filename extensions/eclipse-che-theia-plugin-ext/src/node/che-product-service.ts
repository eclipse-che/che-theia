/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as mime from 'mime';
import { injectable } from 'inversify';
import { CheProductService, Product } from '../common/che-protocol';
import * as path from 'path';
import * as fs from 'fs-extra';

@injectable()
export class CheProductServiceImpl implements CheProductService {

    private product: Product;

    async getProduct(): Promise<Product> {
        if (this.product) {
            return this.product;
        }

        if (process.env.PRODUCT_JSON) {
            let jsonPath = process.env.PRODUCT_JSON;
            jsonPath = jsonPath.startsWith('/') ? jsonPath : path.join(__dirname, jsonPath);

            try {
                const product: Product = await fs.readJson(jsonPath) as Product;

                this.product = {
                    icon: this.getResource(product.icon, jsonPath),
                    logo: typeof product.logo === 'object' ? {
                        dark: this.getResource(product.logo.dark, jsonPath),
                        light: this.getResource(product.logo.light, jsonPath)
                    } : this.getResource(product.logo, jsonPath),
                    name: product.name,
                    welcome: product.welcome,
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
            icon: asBase64(path.join(__dirname, '/../../src/resource/che-logo.svg')),
            logo: {
                dark: asBase64(path.join(__dirname, '/../../src/resource/che-logo-dark.svg')),
                light: asBase64(path.join(__dirname, '/../../src/resource/che-logo-light.svg'))
            },
            name: 'Eclipse Che',
            welcome: {
                title: 'Welcome To Your Cloud Developer Workspace',
                links: undefined
            },
            links: {
                'documentation': {
                    'name': 'Documentation',
                    'url': 'https://www.eclipse.org/che/docs/che-7'
                },
                'help': {
                    'name': 'Community chat',
                    'url': 'https://mattermost.eclipse.org/eclipse/channels/eclipse-che'
                }
            }
        };
    }

    /**
     * Returns string URI to the resource.
     */
    getResource(resource: string, productJsonPath: string): string {
        if (resource.startsWith('http://') || resource.startsWith('https://')) {
            // HTTP resource
            return resource;
        }
        if (resource.startsWith('/')) {
            // absolute path
            return asBase64(resource);
        }
        // relative path
        const productJsonDir = path.dirname(productJsonPath);
        return asBase64(path.join(productJsonDir, resource));
    }
}

function asBase64(filePath: string): string {
    const mimeType = mime.getType(filePath) || '';
    const content = fs.readFileSync(filePath);
    const header = `data:${mimeType};base64,`;
    const dataUrl = header + content.toString('base64');
    return dataUrl;
}
