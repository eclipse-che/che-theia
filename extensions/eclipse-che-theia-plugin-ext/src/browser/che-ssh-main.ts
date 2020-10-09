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
import { CheSshMain } from '../common/che-protocol';
import { SshKeyService } from '@eclipse-che/theia-remote-api/lib/common/ssh-key-service';

export class CheSshMainImpl implements CheSshMain {

    private readonly sshkeyService: SshKeyService;

    constructor(container: interfaces.Container) {
        this.sshkeyService = container.get<SshKeyService>(SshKeyService);
    }

    async $generate(service: string, name: string): Promise<cheApi.ssh.SshPair> {
        return this.sshkeyService.generate(service, name);
    }

    async $create(sshKeyPair: cheApi.ssh.SshPair): Promise<void> {
        return this.sshkeyService.create(sshKeyPair);
    }

    async $get(service: string, name: string): Promise<cheApi.ssh.SshPair> {
        return this.sshkeyService.get(service, name);
    }

    async $getAll(service: string): Promise<cheApi.ssh.SshPair[]> {
        return this.sshkeyService.getAll(service);
    }

    async $deleteKey(service: string, name: string): Promise<void> {
        return this.sshkeyService.delete(service, name);
    }

}
