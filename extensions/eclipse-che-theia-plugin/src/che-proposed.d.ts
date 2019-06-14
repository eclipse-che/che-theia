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

    export namespace ssh {
        export function generate(service: string, name: string): Promise<cheApi.ssh.SshPair>;

        export function create(sshKeyPair: cheApi.ssh.SshPair): Promise<void>;

        export function get(service: string, name: string): Promise<cheApi.ssh.SshPair>;

        export function getAll(service: string): Promise<cheApi.ssh.SshPair[]>;

        export function deleteKey(service: string, name: string): Promise<void>;
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
    }

    /** A Task Runner knows how to run a Task of a particular type. */
    export interface TaskRunner {
        /** Runs a task based on the given task configuration. */
        run(taskConfig: TaskConfiguration, ctx?: string): Promise<Task>;
    }

    export interface Task {
        /** Terminates the task. */
        kill(): Promise<void>;
        /** Returns runtime information about task. */
        getRuntimeInfo(): TaskInfo;
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

        // tslint:disable-next-line:no-any
        readonly [key: string]: any;
    }

    export interface TaskConfiguration {
        /** A label that uniquely identifies a task configuration per source */
        readonly type: string;
        /** A label that uniquely identifies a task configuration */
        readonly label: string;

        /** Additional task type specific properties. */
        readonly [key: string]: any;
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
}
