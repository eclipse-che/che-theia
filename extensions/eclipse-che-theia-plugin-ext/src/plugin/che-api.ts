/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { che as cheApi } from '@eclipse-che/api';
import * as che from '@eclipse-che/plugin';
import { TaskStatusOptions } from '@eclipse-che/plugin';
import { Plugin } from '@theia/plugin-ext/lib/common/plugin-api-rpc';
import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { PLUGIN_RPC_CONTEXT } from '../common/che-protocol';
import { CheDevfileImpl } from './che-devfile';
import { CheFactoryImpl } from './che-factory';
import { CheGithubImpl } from './che-github';
import { CheProductImpl } from './che-product';
import { CheSideCarContentReaderImpl } from './che-sidecar-content-reader';
import { CheSshImpl } from './che-ssh';
import { CheTaskImpl, TaskStatus } from './che-task-impl';
import { CheTelemetryImpl } from './che-telemetry';
import { CheUserImpl } from './che-user';
import { CheVariablesImpl } from './che-variables';
import { CheWorkspaceImpl } from './che-workspace';
import { CheOpenshiftImpl } from './che-openshift';
import { CheOauthImpl } from './che-oauth';
import { Disposable } from '@theia/core';

export interface CheApiFactory {
    (plugin: Plugin): typeof che;
}

export function createAPIFactory(rpc: RPCProtocol): CheApiFactory {
    const cheWorkspaceImpl = rpc.set(PLUGIN_RPC_CONTEXT.CHE_WORKSPACE, new CheWorkspaceImpl(rpc));
    const cheFactoryImpl = rpc.set(PLUGIN_RPC_CONTEXT.CHE_FACTORY, new CheFactoryImpl(rpc));
    const cheDevfileImpl = rpc.set(PLUGIN_RPC_CONTEXT.CHE_DEVFILE, new CheDevfileImpl(rpc));
    const cheVariablesImpl = rpc.set(PLUGIN_RPC_CONTEXT.CHE_VARIABLES, new CheVariablesImpl(rpc));
    const cheTaskImpl = rpc.set(PLUGIN_RPC_CONTEXT.CHE_TASK, new CheTaskImpl(rpc));
    const cheSshImpl = rpc.set(PLUGIN_RPC_CONTEXT.CHE_SSH, new CheSshImpl(rpc));
    const cheGithubImpl = rpc.set(PLUGIN_RPC_CONTEXT.CHE_GITHUB, new CheGithubImpl(rpc));
    const cheOpenshiftImpl = rpc.set(PLUGIN_RPC_CONTEXT.CHE_OPENSHIFT, new CheOpenshiftImpl(rpc));
    const cheOauthImpl = rpc.set(PLUGIN_RPC_CONTEXT.CHE_OAUTH, new CheOauthImpl(rpc));
    const cheUserImpl = rpc.set(PLUGIN_RPC_CONTEXT.CHE_USER, new CheUserImpl(rpc));
    rpc.set(PLUGIN_RPC_CONTEXT.CHE_SIDERCAR_CONTENT_READER, new CheSideCarContentReaderImpl(rpc));

    const cheProductImpl = rpc.set(PLUGIN_RPC_CONTEXT.CHE_PRODUCT, new CheProductImpl(rpc));
    const cheTelemetryImpl = rpc.set(PLUGIN_RPC_CONTEXT.CHE_TELEMETRY, new CheTelemetryImpl(rpc));

    return function (plugin: Plugin): typeof che {
        const workspace: typeof che.workspace = {
            getCurrentWorkspace(): Promise<cheApi.workspace.Workspace> {
                return cheWorkspaceImpl.getCurrentWorkspace();
            },
            getAll(): Promise<cheApi.workspace.Workspace[]> {
                return cheWorkspaceImpl.getAll();
            },
            getAllByNamespace(namespace: string): Promise<cheApi.workspace.Workspace[]> {
                return cheWorkspaceImpl.getAllByNamespace(namespace);
            },
            getById(workspaceKey: string): Promise<cheApi.workspace.Workspace> {
                return cheWorkspaceImpl.getById(workspaceKey);
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            create(config: cheApi.workspace.WorkspaceConfig, params: che.KeyValue): Promise<any> {
                return cheWorkspaceImpl.create(config, params);
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            update(workspaceId: string, workspaceObj: cheApi.workspace.Workspace): Promise<any> {
                return cheWorkspaceImpl.update(workspaceId, workspaceObj);
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            deleteWorkspace(workspaceId: string): Promise<any> {
                return cheWorkspaceImpl.deleteWorkspace(workspaceId);
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            start(workspaceId: string, environmentName: string): Promise<any> {
                return cheWorkspaceImpl.start(workspaceId, environmentName);
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            startTemporary(config: cheApi.workspace.WorkspaceConfig): Promise<any> {
                return cheWorkspaceImpl.startTemporary(config);
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            stop(workspaceId: string): Promise<any> {
                return cheWorkspaceImpl.stop(workspaceId);
            },
            getSettings(): Promise<che.KeyValue> {
                return cheWorkspaceImpl.getSettings();
            }
        };

        const factory: typeof che.factory = {
            getById(id: string): PromiseLike<cheApi.factory.Factory> {
                return cheFactoryImpl.getFactoryById(id);
            }
        };

        const devfile: typeof che.devfile = {
            createWorkspace(devfilePath: string): Promise<void> {
                return cheDevfileImpl.createWorkspace(devfilePath);
            }
        };

        const telemetry: typeof che.telemetry = {
            event(id: string, ownerId: string, properties: [string, string][]): Promise<void> {
                return cheTelemetryImpl.event(id, ownerId, properties);
            },
            addCommandListener(commandId: string, listener: che.TelemetryListener): Promise<void> {
                return cheTelemetryImpl.addCommandListener(commandId, listener);
            },
            getClienAddressInfo(): Promise<che.ClientAddressInfo> {
                return cheTelemetryImpl.getClientAddressInfo();
            }
        };

        const variables: typeof che.variables = {
            registerVariable(variable: che.Variable): Promise<che.Disposable> {
                return cheVariablesImpl.registerVariable(variable);
            },
            resolve(value: string): Promise<string | undefined> {
                return cheVariablesImpl.resolve(value);
            }
        };

        const github: typeof che.github = {
            uploadPublicSshKey(publicKey: string): Promise<void> {
                return cheGithubImpl.uploadPublicSshKey(publicKey);
            },
            getToken(): Promise<string> {
                return cheGithubImpl.getToken();
            }
        };

        const openshift: typeof che.openshift = {
            getToken(): Promise<string> {
                return cheOpenshiftImpl.getToken();
            }
        };

        const oAuth: typeof che.oAuth = {
            getProviders(): Promise<string[]> {
                return cheOauthImpl.getProviders();
            },
            isAuthenticated(provider: string): Promise<boolean> {
                return cheOauthImpl.isAuthenticated(provider);
            },
            isRegistered(provider: string): Promise<boolean> {
                return cheOauthImpl.isRegistered(provider);
            }
        };

        const ssh: typeof che.ssh = {
            deleteKey(service: string, name: string): Promise<void> {
                return cheSshImpl.delete(service, name);
            },
            generate(service: string, name: string): Promise<cheApi.ssh.SshPair> {
                return cheSshImpl.generate(service, name);

            },
            create(sshKeyPair: cheApi.ssh.SshPair): Promise<void> {
                return cheSshImpl.create(sshKeyPair);
            },
            getAll(service: string): Promise<cheApi.ssh.SshPair[]> {
                return cheSshImpl.getAll(service);
            },
            get(service: string, name: string): Promise<cheApi.ssh.SshPair> {
                return cheSshImpl.get(service, name);
            }
        };

        const task: typeof che.task = {
            registerTaskRunner(type: string, runner: che.TaskRunner): Promise<che.Disposable> {
                return cheTaskImpl.registerTaskRunner(type, runner);
            },
            fireTaskExited(event: che.TaskExitedEvent): Promise<void> {
                return cheTaskImpl.fireTaskExited(event);
            },
            addTaskSubschema(schema: che.TaskJSONSchema): Promise<void> {
                return cheTaskImpl.addTaskSubschema(schema);
            },
            setTaskStatus(options: TaskStatusOptions): Promise<void> {
                return cheTaskImpl.setTaskStatus(options);
            },
            onDidStartTask(listener: (event: che.TaskInfo) => void, disposables?: che.Disposable[]): Disposable {
                return cheTaskImpl.onDidStartTask(listener, undefined, disposables);
            },
            onDidEndTask(listener: (event: che.TaskExitedEvent) => void, disposables?: che.Disposable[]): Disposable {
                return cheTaskImpl.onDidEndTask(listener, undefined, disposables);
            }
        };

        const user: typeof che.user = {
            getUserPreferences(filter?: string): Promise<che.Preferences> {
                return cheUserImpl.getUserPreferences(filter);
            },
            updateUserPreferences(update: che.Preferences): Promise<che.Preferences> {
                return cheUserImpl.updateUserPreferences(update);
            },
            replaceUserPreferences(preferences: che.Preferences): Promise<che.Preferences> {
                return cheUserImpl.replaceUserPreferences(preferences);
            },
            deleteUserPreferences(list?: string[]): Promise<void> {
                return cheUserImpl.deleteUserPreferences(list);
            }
        };

        const product: typeof che.product = {
            get icon(): string {
                return cheProductImpl.getIcon();
            },
            get logo(): string | che.Logo {
                return cheProductImpl.getLogo();
            },
            get name(): string {
                return cheProductImpl.getName();
            },
            get welcome(): che.Welcome | undefined {
                return cheProductImpl.getWelcome();
            },
            get links(): che.LinkMap {
                return cheProductImpl.getLinks();
            }
        };

        return <typeof che>{
            workspace,
            factory,
            devfile,
            variables,
            task,
            ssh,
            user,
            product,
            github,
            openshift,
            oAuth,
            telemetry,
            TaskStatus
        };
    };

}
