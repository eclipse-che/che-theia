/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { CheHttpMain } from '../common/che-protocol';
import { HttpService } from '@eclipse-che/theia-remote-api/lib/common/http-service';
import { interfaces } from 'inversify';

export class CheHttpMainImpl implements CheHttpMain {
  private readonly cheHttpService: HttpService;

  constructor(container: interfaces.Container) {
    this.cheHttpService = container.get(HttpService);
  }

  async $get(url: string): Promise<string | undefined> {
    return this.cheHttpService.get(url);
  }
}
