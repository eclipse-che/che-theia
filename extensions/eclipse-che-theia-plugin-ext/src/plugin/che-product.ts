/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { PLUGIN_RPC_CONTEXT, CheProduct, ProductInfo } from '../common/che-protocol';

export class CheProductImpl implements CheProduct {

    private product: ProductInfo = {
        name: '',
        logo: '',
        description: '',
        links: {}
    };

    constructor(rpc: RPCProtocol) {
        const productMain = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_PRODUCT_MAIN);
        productMain.$getProductInfo().then((product: ProductInfo) => {
            this.product = product;
        });
    }

    getName(): string {
        return this.product.name;
    }

    getLogo(): string {
        return this.product.logo;
    }

    getDescription(): string {
        return this.product.description;
    }

    getLinks(): { [text: string]: string } {
        return this.product.links;
    }

}
