/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
/**
 * This is the place for API experiments and proposals.
 * These API are NOT stable and subject to change. Use it on own risk.
 */
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
        export function getById(id: string): PromiseLike<Factory>;
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
        /** Identifier of this factory instance, it is mandatory and unique. */
        id?: string;

        /** Version of this factory instance, it is mandatory. */
        v: string;

        /** Name of this factory instance, the name is unique for creator. */
        name: string;

        /** Creator of this factory instance. */
        creator: Author;

        /** Workspace configuration of this factory instance, it is mandatory for every factory. */
        workspace: WorkspaceConfig;

        /** Restrictions of this factory instance. */
        policies: Policies;

        /** Factory button for this instance. */
        button: FactoryButton;

        /** IDE for this factory instance. */
        ide: Ide;

        /** Hyperlinks. */
        links?: { [attrName: string]: string };
    }

    /**
     * Defines the contract for the factory creator instance.
     */
    export interface Author {
        /** Identifier of the user who created factory, it is mandatory */
        userId: string;

        /** Creation time of factory, set by the server (in milliseconds, from Unix epoch, no timezone) */
        created: number;
    }

    /**
     * Defines the contract for the factory restrictions.
     */
    export interface Policies {

        /** Restrict access if referer header doesn't match this field */
        referer: string;

        /** Restrict access for factories used earlier then author supposes */
        since: number;

        /** Restrict access for factories used later then author supposes */
        until: number;

        /** Workspace creation strategy */
        create: string;
    }

    export type FactoryButtonType = 'logo' | 'nologo';

    /**
     * Defines factory button.
     */
    export interface FactoryButton {

        /** Type of this button instance */
        type: FactoryButtonType;

        /** Attributes of this button instance */
        attributes: FactoryButtonAttributes;
    }

    /**
     * Defines factory button attributes.
     */
    export interface FactoryButtonAttributes {

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
    export interface Ide {

        /** Returns configuration of IDE on application loaded event */
        onAppLoaded?: {
            actions?: FactoryAction[]
        };

        /** Returns configuration of IDE on application closed event */
        onAppClosed?: {
            actions?: FactoryAction[]
        };

        /** Returns configuration of IDE on projects loaded event */
        onProjectsLoaded?: {
            actions?: FactoryAction[]
        };

    }

    /**
     * Defines the contract for the factory action instance.
     */
    export interface FactoryAction {

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

    /**
     * Namespace for variables substitution functionality.
     */
    export namespace variables {

        /**
         * Register a variable.
         *
         * @param variable A variable to register.
         */
        export function registerVariable(variable: Variable): Promise<Disposable>;

        /**
         * Resolve string value.
         *
         * @param value a string value to resolve. If the string contains '${<variable>}' the pattern will be replaced to a variables value.
         */
        export function resolve(value: string): Promise<string | undefined>;
    }

    export class Variable {

        /**
         * Creates a new variable.
         *
         * @param name The variable's unique name.
         * @param description The variable's human-readable description. Is presented in the user interface.
         * @param value The variable's value that may be resolved later.
         * @param isResolved `true` when there is a value already associated and the variable shouldn't be resolved again, i.e. it's value doesn't depend on the current context.
         */
        constructor(name: string, description: string, value?: string, isResolved?: boolean);

        name: string;

        description: string;

        value?: string;

        resolve(): PromiseLike<string | undefined>;

        readonly isResolved: boolean;
    }

    export interface Disposable {
        dispose(): PromiseLike<void>;
    }

}
