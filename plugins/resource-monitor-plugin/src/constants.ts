/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as theia from '@theia/plugin';

export const SHOW_RESOURCES_INFORMATION_COMMAND: theia.CommandDescription = {
  id: 'show-resources-information',
};

export enum Units {
  None = 1,
  K = 1024,
  M = 1024 * 1024,
  G = 1024 * 1024 * 1024,
}
