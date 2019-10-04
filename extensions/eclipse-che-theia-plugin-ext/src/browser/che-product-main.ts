/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { interfaces } from 'inversify';
import { CheProduct, CheProductMain, PLUGIN_RPC_CONTEXT, CheProductService, ProductInfo } from '../common/che-protocol';
import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';

export class CheProductMainImpl implements CheProductMain {

    private proxy: CheProduct;

    private readonly cheProductService: CheProductService;

    private productInfo: ProductInfo;

    constructor(container: interfaces.Container, rpc: RPCProtocol) {
        this.proxy = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_PRODUCT);
        this.cheProductService = container.get(CheProductService);
        this.initialize();
    }

    async initialize(): Promise<void> {
        this.productInfo = await this.cheProductService.getProductInfo();

        this.proxy.$setName(this.productInfo.name);
        this.proxy.$setLogo(this.productInfo.logo);
        this.proxy.$setDescription(this.productInfo.description);
        this.proxy.$setLinks(this.productInfo.links);
    }

}
