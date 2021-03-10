/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { SshKeyService, SshPair } from '@eclipse-che/theia-remote-api/lib/common/ssh-key-service';

import { injectable } from 'inversify';

@injectable()
export class K8sSshKeyServiceImpl implements SshKeyService {
  generate(service: string, name: string): Promise<SshPair> {
    throw new Error('Unsupported operation');
  }

  async create(sshKeyPair: SshPair): Promise<void> {
    console.log('K8sSshKeyServiceImpl.create() is not implemented');
  }

  get(service: string, name: string): Promise<SshPair> {
    throw new Error(`K8sSshKeyServiceImpl.get(${service}, ${name}) is not implemented`);
  }

  getAll(service: string): Promise<SshPair[]> {
    throw new Error('K8sSshKeyServiceImpl.getAll() is not implemented');
  }

  async delete(service: string, name: string): Promise<void> {
    console.log('K8sSshKeyServiceImpl.delete() is not implemented');
  }
}
