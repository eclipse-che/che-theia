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
import * as che from '@eclipse-che/plugin';

export interface CheApiPlugin {
}

export interface CheApiMain {
    $currentWorkspace(): Promise<WorkspaceDto>;
    $getFactory(factoryId: string): Promise<MYFactoryDto>;
}

export interface CheVariables {
    registerVariable(variable: che.Variable): Promise<che.Disposable>;
    resolve(value: string): Promise<string | undefined>;
    $resolveVariable(variableId: number): Promise<string | undefined>;
}

export interface CheVariablesMain {
    $registerVariable(variable: Variable): Promise<void>;
    $disposeVariable(id: number): Promise<void>;
    $resolve(value: string): Promise<string | undefined>;
}

export interface Variable {
    name: string,
    description: string,
    token: number
}

export interface MYFactoryDto {
    id?: string;
    config: WorkspaceConfigDto;
    status: string | WorkspaceStatus;
    namespace?: string;
    temporary?: boolean;
    attributes?: WorkspaceAttributesDto;
    runtime?: RuntimeDto;
    links?: { [attrName: string]: string };
}

export interface FactoryDto {
    workspace: WorkspaceConfigDto;
    ide?: {
        onAppLoaded?: {
            actions?: FactoryActionDto[]
        };
        onProjectsLoaded?: {
            actions?: FactoryActionDto[]
        };
        onAppClosed?: {
            actions?: FactoryActionDto[]
        };
    }
}

export interface FactoryActionDto {
    id: string,
    properties?: {
        name?: string,
        file?: string,
        greetingTitle?: string,
        greetingContentUrl?: string
    }
}

export interface WorkspaceConfigDto {
    name?: string;
    description?: string;
    defaultEnv: string;
    environments: {
        [environmentName: string]: any;
    };
    projects: ProjectConfigDto[];
    commands?: CommandDto[];
    links?: LinkDto[];
}
export interface ProjectConfigDto {
    name: string;
    path: string;
    description?: string;
    mixins?: string[];
    attributes?: { [attrName: string]: string[] };
    source?: SourceStorageDto;
    problems?: ProjectProblemDto;
}

export interface SourceStorageDto {
    type: string;
    location: string;
    parameters: { [attrName: string]: string };
}

export interface ProjectProblemDto {
    code: number;
    message: string;
}

export interface CommandDto {
    name: string;
    commandLine: string;
    type: string;
    attributes?: { [attrName: string]: string };
}

export interface LinkDto {
    href: string;
    rel?: string;
    method: string;
    produces?: string;
    consumes?: string;
    parameters?: LinkParameterDto[];
    requestBody?: RequestBodyDescriptor;
}

export interface WorkspaceDto {
    id?: string;
    config: WorkspaceConfigDto;
    status: string | WorkspaceStatus;
    namespace?: string;
    temporary?: boolean;
    attributes?: WorkspaceAttributesDto;
    runtime?: RuntimeDto;
    links?: { [attrName: string]: string };
}

export type WorkspaceStatus = 'STARTING' | 'RUNNING' | 'STOPPING' | 'STOPPED';

export interface RuntimeDto {
    activeEnv: string;
    machines: { [attrName: string]: MachineDto };
    owner: string;
    warnings?: WarningDto;
}

export interface MachineDto {
    status: string | MachineStatus;
    servers: { [attrName: string]: ServerDto };
    attributes?: { [attrName: string]: string };
}

export type MachineStatus = 'STARTING' | 'RUNNING' | 'STOPPED' | 'FAILED';

export interface ServerDto {
    url: string;
    status: string | ServerStatus;
    attributes?: { [attrName: string]: string };
}

export type ServerStatus = 'RUNNING' | 'STOPPED' | 'UNKNOWN';

export interface WarningDto {
    code: number;
    message: string;
}


export interface WorkspaceAttributesDto {
    created: number;
    updated?: number;
    stackId?: string;
    errorMessage?: string;
    [propName: string]: string | number | any;
}


export interface LinkParameterDto {
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
    CHE_VARIABLES: <ProxyIdentifier<CheVariables>>createProxyIdentifier<CheVariables>('CheVariables'),
    CHE_VARIABLES_MAIN: <ProxyIdentifier<CheVariablesMain>>createProxyIdentifier<CheVariablesMain>('CheVariablesMain'),
};

// Theia RPC protocol

export const CHE_API_SERVICE_PATH = '/che-api-service';

export const CheApiService = Symbol('CheApiService');

export interface CheApiService {
    currentWorkspace(): Promise<WorkspaceDto>;
    getFactory(factoryId: string): Promise<MYFactoryDto>;

}
