/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { inject, injectable } from 'inversify';

import { CheServerRemoteApiImpl } from './che-server-remote-api-impl';
import { FactoryService } from '@eclipse-che/theia-remote-api/lib/common/factory-service';

@injectable()
export class CheServerFactoryServiceImpl implements FactoryService {
  @inject(CheServerRemoteApiImpl)
  private cheServerRemoteApiImpl: CheServerRemoteApiImpl;

  public async getFactoryLink(url: string): Promise<string> {
    let baseURI = this.cheServerRemoteApiImpl.getCheApiURI();

    if (!baseURI) {
      throw new Error('Che API URI is not set');
    }

    if (baseURI.endsWith('/api')) {
      baseURI = baseURI.substring(0, baseURI.length - 4);
    }

    return `${baseURI}/f?url=${url}`;
  }
}
