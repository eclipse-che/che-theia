/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { che } from '@eclipse-che/api';

export const cheSshKeyServicePath = '/services/che-ssh-service';

export interface SshPair extends che.ssh.SshPair {

}

export const SshKeyService = Symbol('SshKeyService');
export interface SshKeyService {

    generate(service: string, name: string): Promise<SshPair>;
    create(sshKeyPair: SshPair): Promise<void>;
    get(service: string, name: string): Promise<SshPair>;
    delete(service: string, name: string): Promise<void>;
    getAll(service: string): Promise<SshPair[]>;

}
