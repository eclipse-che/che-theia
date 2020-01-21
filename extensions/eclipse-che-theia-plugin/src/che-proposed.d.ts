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

import { che as cheApi } from '@eclipse-che/api'
import * as theia from '@theia/plugin';

declare module '@eclipse-che/plugin' {

    export interface KeyValue {
        [key: string]: string;
    }

    export namespace workspace {
        export function getCurrentWorkspace(): Promise<cheApi.workspace.Workspace>;
        export function getAll(): Promise<cheApi.workspace.Workspace[]>;
        export function getAllByNamespace(namespace: string): Promise<cheApi.workspace.Workspace[]>;
        export function getById(workspaceId: string): Promise<cheApi.workspace.Workspace>;
        export function create(config: cheApi.workspace.WorkspaceConfig, params: KeyValue): Promise<any>;
        export function update(workspaceId: string, workspace: cheApi.workspace.Workspace): Promise<any>;
        export function deleteWorkspace(workspaceId: string): Promise<any>;
        export function start(workspaceId: string, environmentName: string): Promise<any>;
        export function startTemporary(config: cheApi.workspace.WorkspaceConfig): Promise<any>;
        export function stop(workspaceId: string): Promise<any>;
        export function getSettings(): Promise<KeyValue>;
    }

    export namespace factory {
        export function getById(id: string): PromiseLike<cheApi.factory.Factory>;
    }

    export namespace devfile {
        export function createWorkspace(devfilePath: string): Promise<void>;
    }

    export namespace github {
        export function uploadPublicSshKey(publicKey: string): Promise<void>;
    }

    export namespace ssh {
        export function generate(service: string, name: string): Promise<cheApi.ssh.SshPair>;

        export function create(sshKeyPair: cheApi.ssh.SshPair): Promise<void>;

        export function get(service: string, name: string): Promise<cheApi.ssh.SshPair>;

        export function getAll(service: string): Promise<cheApi.ssh.SshPair[]>;

        export function deleteKey(service: string, name: string): Promise<void>;
    }

    export namespace telemetry {
        export function event(id: string, ownerId: string, properties: [string, string][]): Promise<void>;
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

    export namespace task {
        export function registerTaskRunner(type: string, runner: TaskRunner): Promise<Disposable>;
        /** Needs to be executed when the task is finished */
        export function fireTaskExited(event: TaskExitedEvent): Promise<void>;
        /** Add task subschema */
        export function addTaskSubschema(schema: TaskJSONSchema): Promise<void>;

        /** Set task status */
        export function setTaskStatus(options: TaskStatusOptions): Promise<void>;

        /** Fires when a task starts. */
        export const onDidStartTask: theia.Event<TaskInfo>;
        /** Fires when a task is completed. */
        export const onDidEndTask: theia.Event<TaskExitedEvent>;
    }

    export interface TerminalWidgetIdentifier {
        factoryId: string;
        widgetId?: string;
        processId?: number;
    }

    export enum TaskStatus {
        Success = 'SUCCESS',
        Error = 'ERROR',
        Unknown = 'UNKNOWN'
    }

    export interface TaskStatusOptions {
        status: TaskStatus;
        terminalIdentifier: TerminalWidgetIdentifier;
    }

    /** A Task Runner knows how to run a Task of a particular type. */
    export interface TaskRunner {
        /** Runs a task based on the given task configuration. */
        run(taskConfig: TaskConfiguration, ctx?: string): Promise<TaskInfo>;
        /** Terminates a task based on the given info. */
        kill(taskInfo: TaskInfo): Promise<void>;
    }

    /** Runtime information about Task. */
    export interface TaskInfo {
        /** internal unique task id */
        readonly taskId: number,
        /** terminal id. Defined if task is run as a terminal process */
        readonly terminalId?: number,
        /** context that was passed as part of task creation, if any */
        readonly ctx?: string,
        /** task config used for launching a task */
        readonly config: TaskConfiguration
        // tslint:disable-next-line:no-any
        readonly [key: string]: any;
    }

    export interface TaskExitedEvent {
        readonly taskId?: number;
        readonly ctx?: string;

        readonly code?: number;
        readonly signal?: string;

        readonly config?: TaskConfiguration;

        readonly terminalId?: number;
        readonly processId?: number;

        // tslint:disable-next-line:no-any
        readonly [key: string]: any;
    }

    export interface TaskConfiguration {
        /** A label that uniquely identifies a task configuration per source */
        readonly type: string;
        /** A label that uniquely identifies a task configuration */
        readonly label: string;
        /**
         * For a provided task, it is the string representation of the URI where the task is supposed to run from. It is `undefined` for global tasks.
         * For a configured task, it is workspace URI that task belongs to.
         * This field is not supposed to be used in `tasks.json`
         */
        readonly _scope: string | undefined;
        /** Additional task type specific properties. */
        readonly [key: string]: any;
    }

    export interface TaskJSONSchema {
        $id?: string;
        type?: string | string[];
        required?: string[];
        properties?: { [key: string]: any };
        additionalProperties?: boolean
    }

    export namespace user {
        export function getUserPreferences(): Promise<Preferences>;
        export function getUserPreferences(filter: string | undefined): Promise<Preferences>;
        export function updateUserPreferences(update: Preferences): Promise<Preferences>;
        export function replaceUserPreferences(preferences: Preferences): Promise<Preferences>;
        export function deleteUserPreferences(): Promise<void>;
        export function deleteUserPreferences(list: string[] | undefined): Promise<void>;
    }

    export interface Preferences {
        [key: string]: string;
    }

    export interface Logo {
        dark: string,
        light: string
    }

    export interface Welcome {
        title: string | undefined;
        links: string[] | undefined;
    }

    export interface Link {
        name: string;
        url: string;
    }

    export interface LinkMap {
        [tag: string]: Link;
    }

    export namespace product {
        export let icon: string;
        export let logo: string | Logo;
        export let name: string;
        export let welcome: Welcome | undefined;
        export let links: LinkMap;
    }

}
