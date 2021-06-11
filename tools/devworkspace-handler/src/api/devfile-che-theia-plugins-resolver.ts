/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { DevfileContext } from './devfile-context';

/**
 * Entry point of the service.
 * Need to update templates based on the given devfile and repository files
 */
export interface DevfileResolver {
  handle(devfileContext: DevfileContext): Promise<void>;
}
