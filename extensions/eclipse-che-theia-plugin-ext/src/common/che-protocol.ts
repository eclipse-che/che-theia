/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { ProxyIdentifier, createProxyIdentifier } from '@theia/plugin-ext/lib/api/rpc-protocol';

export interface CheApiPlugin {

}

export interface CheApiMain {
    $currentWorkspace(): Promise<Workspace>;

    $getFactoryById(id: string): Promise<Factory>;
}

export interface Factory {
    workspace: WorkspaceConfig;
    ide?: {
        onAppLoaded?: {
            actions?: FactoryAction[]
        };
        onProjectsLoaded?: {
            actions?: FactoryAction[]
        };
        onAppClosed?: {
            actions?: FactoryAction[]
        };
    }
}

export interface FactoryAction {
    id: string,
    properties?: {
        name?: string,
        file?: string,
        greetingTitle?: string,
        greetingContentUrl?: string
    }
}

export interface WorkspaceConfig {
    name?: string;
    description?: string;
    defaultEnv: string;
    environments: {
        [environmentName: string]: any;
    };
    projects: ProjectConfig[];
    commands?: Command[];
    links?: Link[];
}
export interface ProjectConfig {
    name: string;
    path: string;
    description?: string;
    mixins?: string[];
    attributes?: { [attrName: string]: string[] };
    source?: SourceStorage;
    problems?: ProjectProblem;
}

export interface SourceStorage {
    type: string;
    location: string;
    parameters: { [attrName: string]: string };
}

export interface ProjectProblem {
    code: number;
    message: string;
}

export interface Command {
    name: string;
    commandLine: string;
    type: string;
    attributes?: { [attrName: string]: string };
}

export interface Link {
    href: string;
    rel?: string;
    method: string;
    produces?: string;
    consumes?: string;
    parameters?: LinkParameter[];
    requestBody?: RequestBodyDescriptor;
}

export interface Workspace {
    id?: string;
    config: WorkspaceConfig;
    status: string | WorkspaceStatus;
    namespace?: string;
    temporary?: boolean;
    attributes?: WorkspaceAttributes;
    runtime?: Runtime;
    links?: { [attrName: string]: string };
}

export type WorkspaceStatus = 'STARTING' | 'RUNNING' | 'STOPPING' | 'STOPPED';

export interface Runtime {
    activeEnv: string;
    machines: { [attrName: string]: Machine };
    owner: string;
    warnings?: Warning;
}

export interface Machine {
    status: string | MachineStatus;
    servers: { [attrName: string]: Server };
    attributes?: { [attrName: string]: string };
}

export type MachineStatus = 'STARTING' | 'RUNNING' | 'STOPPED' | 'FAILED';

export interface Server {
    url: string;
    status: string | ServerStatus;
    attributes?: { [attrName: string]: string };
}

export type ServerStatus = 'RUNNING' | 'STOPPED' | 'UNKNOWN';

export interface Warning {
    code: number;
    message: string;
}


export interface WorkspaceAttributes {
    created: number;
    updated?: number;
    stackId?: string;
    errorMessage?: string;
    [propName: string]: string | number | any;
}


export interface LinkParameter {
    name: string;
    defaultValue?: string;
    description?: string;
    type: LinkParameterType;
    required: boolean;
    valid: string[];
}

export type LinkParameterType = 'String' | 'Number' | 'Boolean' | 'Array' | 'Object';

export interface RequestBodyDescriptor {
    description: string;
}

export const PLUGIN_RPC_CONTEXT = {
    CHE_API_MAIN: <ProxyIdentifier<CheApiMain>>createProxyIdentifier<CheApiMain>('CheApiMain'),
};

// Theia RPC protocol

export const CheApiServicePath = '/che-api-service';

export const CheApiService = Symbol('CheApiService');
export interface CheApiService {
    currentWorkspace(): Promise<Workspace>;
}
