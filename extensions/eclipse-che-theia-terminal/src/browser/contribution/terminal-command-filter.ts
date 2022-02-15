/**********************************************************************
 * Copyright (c) 2018-2022 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { Container } from '@eclipse-che/theia-remote-api/lib/common/workspace-service';

/**
 * @deprecated There is not anymore such value for attributes
 */
export const RECIPE_CONTAINER_SOURCE = 'recipe';
/**
 * @deprecated There is not anymore such attribute
 */
export const CONTAINER_SOURCE_ATTRIBUTE = 'source';

/** Marker for an attribute like: app.kubernetes.io/part-of */
const PART_OF_ATTRIBUTE_MARKER = 'part-of';
/** Value for the attribute app.kubernetes.io/part-of */
const TOOLING_CONTAINER_MARKER = 'che-theia.eclipse.org';

/**
 * Return list containers with recipe source attribute.
 *
 * @deprecated use {@link filterDevContainers()} instead
 */
export function filterRecipeContainers(containers: Container[]): Container[] {
  return containers.filter(container => isDevContainer(container));
}

export function isDevContainer(container: Container): boolean {
  return !isToolingContainer(container);
}

/**
 * Return list Developer containers.
 */
export function filterDevContainers(containers: Container[]): Container[] {
  return containers.filter(container => isDevContainer(container));
}

export function isToolingContainer(container: Container): boolean {
  const attribute = findAttributeByAttributeEnding(PART_OF_ATTRIBUTE_MARKER, container.attributes);
  return !!attribute && attribute === TOOLING_CONTAINER_MARKER;
}

function findAttributeByAttributeEnding(ending: string, attributes?: { [key: string]: string }): string | undefined {
  if (!attributes) {
    return undefined;
  }

  for (const attribute in attributes) {
    if (attributes.hasOwnProperty(attribute) && attribute.endsWith(ending)) {
      return attributes[attribute];
    }
  }
}
