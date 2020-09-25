/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { che as cheApi } from '@eclipse-che/api';

export const cheWorkspaceServicePath = '/services/che-workspace-service';

export interface Workspace extends cheApi.workspace.Workspace {

}

export interface Container extends cheApi.workspace.Machine {
    name: string
}

export interface Endpoint extends cheApi.workspace.Server {

}

export interface WorkspaceSettings {
    [key: string]: string;
}

export const WorkspaceService = Symbol('WorkspaceService');
export interface WorkspaceService {
    getCurrentWorkspaceId(): Promise<string>;
    currentWorkspace(): Promise<Workspace>;
    getWorkspaceById(workspaceId: string): Promise<Workspace>;
    getAll(userToken?: string): Promise<Workspace[]>;
    getAllByNamespace(namespace: string, userToken?: string): Promise<Workspace[]>;
    getCurrentWorkspacesContainers(): Promise<{ [key: string]: Container }>;
    findUniqueEndpointByAttribute(attributeName: string, attributeValue: string): Promise<Endpoint>;
    updateWorkspace(workspaceId: string, workspace: cheApi.workspace.Workspace): Promise<Workspace>;
    updateWorkspaceActivity(): Promise<void>;
    getWorkspaceSettings(): Promise<WorkspaceSettings>;

    stop(): Promise<void>;

    getContainerList(): Promise<Container[]>;

    findTerminalServer(): Promise<Endpoint | undefined>;

    findEditorContainer(): Promise<string | undefined>

}
