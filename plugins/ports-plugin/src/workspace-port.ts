/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

/**
 * Exposed server port of a workspace.
 */
export interface WorkspacePort {
    url: string;
    portNumber: string;
    serverName: string;
    previewUrl?: PreviewUrl;
}

/**
 * Exposed server preview url configuration.
 */
export interface PreviewUrl {
    port: string;
    path?: string;
}
