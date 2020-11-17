/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { SshKeyService, SshPair } from '../common/ssh-key-service';
import { inject, injectable } from 'inversify';

import { CheServerRemoteApiImpl } from './che-server-remote-api-impl';

@injectable()
export class CheServerSshKeyServiceImpl implements SshKeyService {
  @inject(CheServerRemoteApiImpl)
  private cheServerRemoteApiImpl: CheServerRemoteApiImpl;

  generate(service: string, name: string): Promise<SshPair> {
    return this.cheServerRemoteApiImpl.getAPI().generateSshKey(service, name);
  }

  create(sshKeyPair: SshPair): Promise<void> {
    return this.cheServerRemoteApiImpl.getAPI().createSshKey(sshKeyPair);
  }

  get(service: string, name: string): Promise<SshPair> {
    return this.cheServerRemoteApiImpl.getAPI().getSshKey(service, name);
  }

  getAll(service: string): Promise<SshPair[]> {
    return this.cheServerRemoteApiImpl.getAPI().getAllSshKey(service);
  }

  delete(service: string, name: string): Promise<void> {
    return this.cheServerRemoteApiImpl.getAPI().deleteSshKey(service, name);
  }
}
