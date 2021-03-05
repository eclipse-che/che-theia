/**********************************************************************
 * Copyright (c) 2019-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as theia from '@theia/plugin';

import { injectable } from 'inversify';

@injectable()
export abstract class Command implements theia.CommandDescription {
  // constructor(public readonly id: string, public readonly label: string) {}
  constructor() {}

  public id: string;

  public label: string;

  init(id: string, label: string) {
    this.id = id;
    this.label = label;
  }

  abstract run(context?: { gitCloneFlow?: boolean }): Promise<boolean | void>;
}
