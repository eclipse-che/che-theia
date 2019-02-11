/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { che as cheApi } from '@eclipse-che/api';
import { interfaces } from 'inversify';
import { CheApiService, CheSshMain } from '../common/che-protocol';

export class CheSshMainImpl implements CheSshMain {

    private readonly cheApiService: CheApiService;

    constructor(container: interfaces.Container) {
        this.cheApiService = container.get(CheApiService);
    }

    async $generate(service: string, name: string): Promise<cheApi.ssh.SshPair> {
        return this.cheApiService.generateSshKey(service, name);
    }

    async $create(sshKeyPair: cheApi.ssh.SshPair): Promise<void> {
        return this.cheApiService.createSshKey(sshKeyPair);
    }

    async $get(service: string, name: string): Promise<cheApi.ssh.SshPair> {
        return this.cheApiService.getSshKey(service, name);
    }

    async $getAll(service: string): Promise<cheApi.ssh.SshPair[]> {
        return this.cheApiService.getAllSshKey(service);
    }

    async $deleteKey(service: string, name: string): Promise<void> {
        return this.cheApiService.deleteSshKey(service, name);
    }

}
