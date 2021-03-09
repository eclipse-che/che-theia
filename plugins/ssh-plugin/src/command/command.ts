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

import { injectable, unmanaged } from 'inversify';

@injectable()
export abstract class Command implements theia.CommandDescription {
  constructor(@unmanaged() public readonly id: string, @unmanaged() public readonly label: string) {}

  abstract run(context?: { gitCloneFlow?: boolean }): Promise<boolean | void>;
}
