/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { FactoryService } from '@eclipse-che/theia-remote-api/lib/common/factory-service';
import { injectable } from 'inversify';

@injectable()
export class K8sFactoryServiceImpl implements FactoryService {
  public async getFactoryLink(url: string): Promise<string> {
    // should have dashboard URL provided ?
    throw new Error(`K8sFactoryServiceImpl.getFactoryLink(${url}) not supported`);
  }
}
