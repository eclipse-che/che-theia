/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { V1alpha2DevWorkspaceSpecTemplateComponentsItemsContainer } from '@devfile/api';

/**
 * Defines the entry of VS code extension with its extra information like if there is a need for a sidecar image, memory information, etc.
 */
export interface VSCodeExtensionEntry {
  // identifier of the VS Code extension like the one we can have on market place
  id: string;

  // resolved is set to true only when we have the full definition
  // for example if there is only the id, then plug-in registry needs to be reached to grab the content
  resolved: boolean;

  // if the plug-in is not found, we can skip it
  optional?: boolean;

  // optional preferences for this VS Code extension
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  preferences?: { [key: string]: any };

  // optional dependencies for this VS Code extension
  dependencies?: string[];

  // optional sidecar information
  sidecarName?: string;
  sidecar?: V1alpha2DevWorkspaceSpecTemplateComponentsItemsContainer;

  // URL of vsix files to be installed
  extensions: string[];
}

export interface VSCodeExtensionEntryWithSidecar extends VSCodeExtensionEntry {
  // sidecar is mandatory
  sidecar: V1alpha2DevWorkspaceSpecTemplateComponentsItemsContainer;
}
