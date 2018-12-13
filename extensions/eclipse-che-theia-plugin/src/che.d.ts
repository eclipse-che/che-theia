/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

declare module '@eclipse-che/plugin' {

    export namespace workspace {
        export function getCurrentWorkspace(): Promise<Workspace>;
        export function getAll(): Promise<Workspace[]>;
        export function getAllByNamespace(namespace: string): Promise<Workspace[]>;
        export function getById(workspaceKey: string): Promise<Workspace>;
        export function create(config: WorkspaceConfig, params: ResourceCreateQueryParams): Promise<any>;
        export function update(workspaceId: string, workspace: Workspace): Promise<any>;
        export function deleteWorkspace(workspaceId: string): Promise<any>;
        export function start(workspaceId: string, environmentName: string): Promise<any>;
        export function startTemporary(config: WorkspaceConfig): Promise<any>;
        export function stop(workspaceId: string): Promise<any>;
        export function getSettings(): Promise<WorkspaceSettings>;
    }

    export namespace factory {
        export function getFactory(id: string): PromiseLike<MYFactory>;
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

    export interface WorkspaceAttributes {
        created: number;
        updated?: number;
        stackId?: string;
        errorMessage?: string;
        [propName: string]: string | number | any;
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

    export type WorkspaceStatus = 'STARTING' | 'RUNNING' | 'STOPPING' | 'STOPPED';

    export interface Runtime {
        activeEnv: string;
        machines: { [attrName: string]: Machine };
        owner: string;
        warnings?: Warning;
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

    export interface WorkspaceSettings {
        supportedRecipeTypes: string;
    }

    export interface ResourceQueryParams {
        [propName: string]: string | undefined;
    }

    export interface ResourceCreateQueryParams extends ResourceQueryParams {
        attribute: string;
        namespace?: string;
    }

    export interface Factory {
        name: string;
        getProjects(): Project[];
        getOnProjectsImportedActions(): FactoryAction[];
        getFactoryOnAppLoadedActions(): FactoryAction[];
        getFactoryOnAppClosedActions(): FactoryAction[];
    }

    export interface Project {
        getPath(): string;
        getLocationURI(): string | undefined;
        getCheckoutBranch(): string | undefined;
    }

    export interface FactoryAction {
        getId(): string;
        getProperties(): FactoryActionProperties | undefined;
    }

    export interface FactoryActionProperties {
        name?: string,
        file?: string,
        greetingTitle?: string,
        greetingContentUrl?: string
    }

    export interface MYFactory {
        id?: string;
        config: WorkspaceConfig;
        status: string | WorkspaceStatus;
        namespace?: string;
        temporary?: boolean;
        attributes?: WorkspaceAttributes;
        runtime?: Runtime;
        links?: { [attrName: string]: string };
    }

}
