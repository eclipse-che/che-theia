/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { ProxyIdentifier, createProxyIdentifier } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { che as cheApi } from '@eclipse-che/api';
import * as che from '@eclipse-che/plugin';
import { Event, JsonRpcServer } from '@theia/core';
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
    $update(workspaceId: string, workspace: cheApi.workspace.Workspace): Promise<cheApi.workspace.Workspace>;
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

export interface CheDevfile {
}

export interface CheDevfileMain {
    $createWorkspace(devfilePath: string): Promise<void>;
}

export interface CheSsh {
}

export interface CheSshMain {
    $generate(service: string, name: string): Promise<cheApi.ssh.SshPair>;
    $create(sshKeyPair: cheApi.ssh.SshPair): Promise<void>;
    $get(service: string, name: string): Promise<cheApi.ssh.SshPair>;
    $getAll(service: string): Promise<cheApi.ssh.SshPair[]>;
    $deleteKey(service: string, name: string): Promise<void>;
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

export interface CheTask {
    registerTaskRunner(type: string, runner: che.TaskRunner): Promise<che.Disposable>;
    fireTaskExited(event: che.TaskExitedEvent): Promise<void>;
    $runTask(id: number, config: che.TaskConfiguration, ctx?: string): Promise<void>;
    $onTaskExited(id: number): Promise<void>;
    $killTask(id: number): Promise<void>;
    $getTaskInfo(id: number): Promise<che.TaskInfo | undefined>;
}

export const CheTaskMain = Symbol('CheTaskMain');
export interface CheTaskMain {
    $registerTaskRunner(type: string): Promise<void>;
    $disposeTaskRunner(type: string): Promise<void>;
    $fireTaskExited(event: che.TaskExitedEvent): Promise<void>;
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
        // tslint:disable-next-line: no-any
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
    // tslint:disable-next-line: no-any
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

export interface Preferences {
    [key: string]: string;
}

export interface WorkspaceSettings {
    [key: string]: string;
}

export const PLUGIN_RPC_CONTEXT = {
    CHE_WORKSPACE: <ProxyIdentifier<CheWorkspace>>createProxyIdentifier<CheWorkspace>('CheWorkspace'),
    CHE_WORKSPACE_MAIN: <ProxyIdentifier<CheWorkspaceMain>>createProxyIdentifier<CheWorkspaceMain>('CheWorkspaceMain'),

    CHE_FACTORY: <ProxyIdentifier<CheFactory>>createProxyIdentifier<CheFactory>('CheFactory'),
    CHE_FACTORY_MAIN: <ProxyIdentifier<CheFactoryMain>>createProxyIdentifier<CheFactoryMain>('CheFactoryMain'),

    CHE_DEVFILE: <ProxyIdentifier<CheDevfile>>createProxyIdentifier<CheDevfile>('CheDevfile'),
    CHE_DEVFILE_MAIN: <ProxyIdentifier<CheDevfileMain>>createProxyIdentifier<CheDevfileMain>('CheDevfileMain'),

    CHE_VARIABLES: <ProxyIdentifier<CheVariables>>createProxyIdentifier<CheVariables>('CheVariables'),
    CHE_VARIABLES_MAIN: <ProxyIdentifier<CheVariablesMain>>createProxyIdentifier<CheVariablesMain>('CheVariablesMain'),
    CHE_TASK: <ProxyIdentifier<CheTask>>createProxyIdentifier<CheTask>('CheTask'),
    CHE_TASK_MAIN: <ProxyIdentifier<CheTaskMain>>createProxyIdentifier<CheTaskMain>('CheTaskMain'),

    CHE_SSH: <ProxyIdentifier<CheSsh>>createProxyIdentifier<CheSsh>('CheSsh'),
    CHE_SSH_MAIN: <ProxyIdentifier<CheSshMain>>createProxyIdentifier<CheSshMain>('CheSshMain'),

    CHE_USER: <ProxyIdentifier<CheUser>>createProxyIdentifier<CheUser>('CheUser'),
    CHE_USER_MAIN: <ProxyIdentifier<CheUserMain>>createProxyIdentifier<CheUserMain>('CheUserMain'),
};

// Theia RPC protocol

export const CHE_API_SERVICE_PATH = '/che-api-service';

export const CheApiService = Symbol('CheApiService');

export interface CheApiService {
    getCurrentWorkspaceId(): Promise<string>;
    getCheApiURI(): Promise<string | undefined>;

    currentWorkspace(): Promise<cheApi.workspace.Workspace>;
    getWorkspaceById(workspaceId: string): Promise<cheApi.workspace.Workspace>;

    updateWorkspace(workspaceId: string, workspace: cheApi.workspace.Workspace): Promise<cheApi.workspace.Workspace>;
    stop(): Promise<void>;

    getFactoryById(factoryId: string): Promise<cheApi.factory.Factory>;

    getUserPreferences(): Promise<Preferences>;
    getUserPreferences(filter: string | undefined): Promise<Preferences>;
    updateUserPreferences(update: Preferences): Promise<Preferences>;
    replaceUserPreferences(preferences: Preferences): Promise<Preferences>;
    deleteUserPreferences(): Promise<void>;
    deleteUserPreferences(list: string[] | undefined): Promise<void>;
    getWorkspaceSettings(): Promise<WorkspaceSettings>;

    generateSshKey(service: string, name: string): Promise<cheApi.ssh.SshPair>;
    createSshKey(sshKeyPair: cheApi.ssh.SshPair): Promise<void>;
    getSshKey(service: string, name: string): Promise<cheApi.ssh.SshPair>;
    deleteSshKey(service: string, name: string): Promise<void>;
    getAllSshKey(service: string): Promise<cheApi.ssh.SshPair[]>;
}

export const CHE_TASK_SERVICE_PATH = '/che-task-service';

export const CheTaskService = Symbol('CheTaskService');
export interface CheTaskService extends JsonRpcServer<CheTaskClient> {
    registerTaskRunner(type: string): Promise<void>;
    disposeTaskRunner(type: string): Promise<void>;
    disconnectClient(client: CheTaskClient): void;
    fireTaskExited(event: che.TaskExitedEvent): Promise<void>;
}

export const CheTaskClient = Symbol('CheTaskClient');
export interface CheTaskClient {
    runTask(id: number, taskConfig: che.TaskConfiguration, ctx?: string): Promise<void>;
    killTask(id: number): Promise<void>;
    getTaskInfo(id: number): Promise<che.TaskInfo | undefined>;
    onTaskExited(id: number): Promise<void>;
    addTaskInfoHandler(func: (id: number) => Promise<che.TaskInfo | undefined>): void;
    addRunTaskHandler(func: (id: number, config: che.TaskConfiguration, ctx?: string) => Promise<void>): void;
    addTaskExitedHandler(func: (id: number) => Promise<void>): void;
    onKillEvent: Event<number>
}

export interface ChePluginRegistry {
    name: string,
    uri: string
}

export interface ChePlugin {
    publisher: string;
    name: string;
    version: string;
    installed: boolean;
    versionList: {
        [version: string]: ChePluginMetadata;
    }
}

/**
 * Describes properties in plugin meta.yaml
 */
export interface ChePluginMetadata {
    publisher: string,
    name: string,
    version: string,
    type: string,
    displayName: string,
    title: string,
    description: string,
    icon: string,
    url: string,
    repository: string,
    firstPublicationDate: string,
    category: string,
    latestUpdateDate: string,

    // Plugin KEY. Used to set in workpsace configuration
    key: string,
    builtIn: boolean
}

export const CHE_PLUGIN_SERVICE_PATH = '/che-plugin-service';

export const ChePluginService = Symbol('ChePluginService');

export interface ChePluginService {

    /**
     * Returns default plugin registry;
     */
    getDefaultRegistry(): Promise<ChePluginRegistry>;

    /**
     * Returns a list of available plugins on the plugin registry.
     *
     * @param registry ChePluginRegistry plugin registry
     * @param filter filter
     * @return list of available plugins
     */
    getPlugins(registry: ChePluginRegistry, filter: string): Promise<ChePluginMetadata[]>;

    /**
     * Returns list of plugins described in workspace configuration.
     */
    getWorkspacePlugins(): Promise<string[]>;

    /**
     * Adds a plugin to workspace configuration.
     */
    addPlugin(pluginKey: string): Promise<void>;

    /**
     * Removes a plugin from workspace configuration.
     */
    removePlugin(pluginKey: string): Promise<void>;

    /**
     * Changes the plugin version.
     */
    updatePlugin(oldPluginKey: string, newPluginKey: string): Promise<void>;

}

export interface CheUser { }

export interface CheUserMain {
    $getUserPreferences(filter?: string): Promise<Preferences>;
    $updateUserPreferences(preferences: Preferences): Promise<Preferences>;
    $replaceUserPreferences(preferences: Preferences): Promise<Preferences>;
    $deleteUserPreferences(list?: string[]): Promise<void>;
}
