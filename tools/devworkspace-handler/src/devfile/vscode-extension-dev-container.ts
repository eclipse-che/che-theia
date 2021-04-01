/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import {
  V1alpha2DevWorkspaceSpecTemplateComponentsItemsContainerEndpoints,
  V1alpha2DevWorkspaceSpecTemplateComponentsItemsContainerEnv,
  V1alpha2DevWorkspaceSpecTemplateComponentsItemsContainerVolumeMounts,
} from '@devfile/api';

/**
 * Information to add in a dev container.
 */
export interface VSCodeExtensionDevContainer {
  // optional preferences for this VS Code extension
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  preferences?: { [key: string]: any };

  // extra volume mounts to add
  volumeMounts?: Array<V1alpha2DevWorkspaceSpecTemplateComponentsItemsContainerVolumeMounts>;

  endpoints?: Array<V1alpha2DevWorkspaceSpecTemplateComponentsItemsContainerEndpoints>;

  // extra volume mounts to add
  env?: Array<V1alpha2DevWorkspaceSpecTemplateComponentsItemsContainerEnv>;

  // extensions
  extensions: string[];
}
