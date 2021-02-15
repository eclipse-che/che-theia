/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as che from '@eclipse-che/plugin';
/**
 * Export @eclipse-che/plugin namespace as extensions.getExtension('@eclipse-che/ext-plugin') value
 */
export async function start(): Promise<unknown> {
  const apiObject = che;
  return apiObject;
}
