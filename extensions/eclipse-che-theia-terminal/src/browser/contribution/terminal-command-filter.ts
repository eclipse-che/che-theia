/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { WorkspaceContainer } from "../../common/workspace-service";

export const RECIPE_CONTAINER_SOURCE = 'recipe';
export const CONTAINER_SOURCE_ATTRIBUTE = 'source';

 /**
  * Return list containers for which should be create terminal.
  */
 export function filterContainers(containers: WorkspaceContainer[]): WorkspaceContainer[] {
     return containers.filter((container: WorkspaceContainer) => {
         return container.attributes && (!container.attributes[CONTAINER_SOURCE_ATTRIBUTE] || container.attributes[CONTAINER_SOURCE_ATTRIBUTE] == RECIPE_CONTAINER_SOURCE);
     });
 }
