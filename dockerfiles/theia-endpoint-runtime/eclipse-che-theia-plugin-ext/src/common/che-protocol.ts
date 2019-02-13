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
import { che as cheApi } from '@eclipse-che/api';

/**
 * Workspace plugin API
 */
export interface CheWorkspace {
}

export interface CheWorkspaceMain {
    $getCurrentWorkspace(): Promise<cheApi.workspace.Workspace>;
    // getAll(): Promise<Workspace[]>;
    // getAllByNamespace(namespace: string): Promise<Workspace[]>;
    $getById(workspaceId: string): Promise<cheApi.workspace.Workspace>;
    // create(config: WorkspaceConfig, params: ResourceCreateQueryParams): Promise<any>;
    $update(workspaceId: string, workspace: cheApi.workspace.Workspace): Promise<any>;
    // deleteWorkspace(workspaceId: string): Promise<any>;
    // start(workspaceId: string, environmentName: string): Promise<any>;
    // startTemporary(config: WorkspaceConfig): Promise<any>;
    // stop(workspaceId: string): Promise<any>;
    // getSettings(): Promise<WorkspaceSettings>;
}

/**
 * Factory plugin API
 */
export interface CheFactory {
}

export interface CheFactoryMain {
    $getFactoryById(factoryId: string): Promise<cheApi.factory.Factory>;
}

/**
 * Variables plugin API
 */
export interface CheVariables {
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

export interface FactoryDto {
    /** Identifier of this factory instance, it is mandatory and unique. */
    id?: string;

    /** Version of this factory instance, it is mandatory. */
    v: string;

    /** Name of this factory instance, the name is unique for creator. */
    name: string;

    /** Creator of this factory instance. */
    creator: AuthorDto;

    /** Workspace configuration of this factory instance, it is mandatory for every factory. */
    workspace: WorkspaceConfigDto;

    /** Restrictions of this factory instance. */
    policies: PoliciesDto;

    /** Factory button for this instance. */
    button: FactoryButtonDto;

    /** IDE for this factory instance. */
    ide: IdeDto;

    /** Hyperlinks. */
    links?: { [attrName: string]: string };
}

/**
 * Defines the contract for the factory creator instance.
 */
export interface AuthorDto {
    /** Identifier of the user who created factory, it is mandatory */
    userId: string;

    /** Creation time of factory, set by the server (in milliseconds, from Unix epoch, no timezone) */
    created: number;
}

/**
 * Defines the contract for the factory restrictions.
 */
export interface PoliciesDto {

    /** Restrict access if referer header doesn't match this field */
    referer: string;

    /** Restrict access for factories used earlier then author supposes */
    since: number;

    /** Restrict access for factories used later then author supposes */
    until: number;

    /** Workspace creation strategy */
    create: string;
}

export type FactoryButtonTypeDto = 'logo' | 'nologo';

/**
 * Defines factory button.
 */
export interface FactoryButtonDto {

    /** Type of this button instance */
    type: FactoryButtonTypeDto;

    /** Attributes of this button instance */
    attributes: FactoryButtonAttributesDto;
}

/**
 * Defines factory button attributes.
 */
export interface FactoryButtonAttributesDto {

    /** Factory button color */
    color: string;

    /** Factory button counter */
    counter: boolean;

    /** Factory button logo */
    logo: string;

    /** Factory button style */
    style: string;
}

/**
 * Defines the contract for the factory IDE instance.
 */
export interface IdeDto {

    /** Returns configuration of IDE on application loaded event */
    onAppLoaded?: {
        actions?: FactoryActionDto[];
    };

    /** Returns configuration of IDE on application closed event */
    onAppClosed?: {
        actions?: FactoryActionDto[];
    };

    /** Returns configuration of IDE on projects loaded event */
    onProjectsLoaded?: {
        actions?: FactoryActionDto[];
    };

}

/**
 * Defines the contract for the factory action instance.
 */
export interface FactoryActionDto {

    /** IDE specific identifier of action e.g. ('openFile', 'editFile') */
    id: string,

    /** Properties of this action instance */
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
    CHE_WORKSPACE: <ProxyIdentifier<CheWorkspace>>createProxyIdentifier<CheWorkspace>('CheWorkspace'),
    CHE_WORKSPACE_MAIN: <ProxyIdentifier<CheWorkspaceMain>>createProxyIdentifier<CheWorkspaceMain>('CheWorkspaceMain'),

    CHE_FACTORY: <ProxyIdentifier<CheFactory>>createProxyIdentifier<CheFactory>('CheFactory'),
    CHE_FACTORY_MAIN: <ProxyIdentifier<CheFactoryMain>>createProxyIdentifier<CheFactoryMain>('CheFactoryMain'),

    CHE_VARIABLES: <ProxyIdentifier<CheVariables>>createProxyIdentifier<CheVariables>('CheVariables'),
    CHE_VARIABLES_MAIN: <ProxyIdentifier<CheVariablesMain>>createProxyIdentifier<CheVariablesMain>('CheVariablesMain'),
};

// Theia RPC protocol

export const CHE_API_SERVICE_PATH = '/che-api-service';

export const CheApiService = Symbol('CheApiService');

export interface CheApiService {

    currentWorkspace(): Promise<cheApi.workspace.Workspace>;

    getWorkspaceById(workspaceId: string): Promise<cheApi.workspace.Workspace>;

    updateWorkspace(workspaceId: string, workspace: cheApi.workspace.Workspace): Promise<any>;

    getFactoryById(factoryId: string): Promise<cheApi.factory.Factory>;

}
