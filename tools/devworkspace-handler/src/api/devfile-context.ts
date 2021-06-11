/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/
import { V1alpha2DevWorkspace, V1alpha2DevWorkspaceTemplate } from '@devfile/api';

export enum SidecarPolicy {
  MERGE_IMAGE = 'mergeImage',
  USE_DEV_CONTAINER = 'useDevContainer',
}

/**
 * Context used on every call to this service to resolve VSIX components to add with their optional sidecar and the vsix installer
 */
export interface DevfileContext {
  // devfile Content
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  devfile: any;

  // .che/che-theia-plugins.yaml content
  cheTheiaPluginsContent?: string;

  // .vscode/extensions.json content
  vscodeExtensionsJsonContent?: string;

  // devWorkspace
  devWorkspace: V1alpha2DevWorkspace;

  // devWorkspace templates
  devWorkspaceTemplates: V1alpha2DevWorkspaceTemplate[];

  // merge into dev Container
  sidecarPolicy: SidecarPolicy;

  // suffix to append on generated names
  suffix: string;
}
