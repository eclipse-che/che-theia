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
import { CheProduct } from '../common/che-protocol';

export class CheProductImpl implements CheProduct {

    private name: string = '';
    private logo: string = '';
    private description: string = '';
    private links: { [text: string]: string } = {};

    constructor(rpc: RPCProtocol) {
        // this.productMain = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_PRODUCT_MAIN);
    }

    async $setName(name: string): Promise<void> {
        this.name = name;
    }

    async $setLogo(logo: string): Promise<void> {
        this.logo = logo;
    }

    async $setDescription(description: string): Promise<void> {
        this.description = description;
    }

    async $setLinks(links: { [text: string]: string }): Promise<void> {
        this.links = links;
    }

    getName(): string {
        return this.name;
    }

    getLogo(): string {
        return this.logo;
    }

    getDescription(): string {
        return this.description;
    }

    getLinks(): { [text: string]: string } {
        return this.links;
    }

}
