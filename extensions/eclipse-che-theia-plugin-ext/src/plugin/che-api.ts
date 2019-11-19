/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as che from '@eclipse-che/plugin';
import { che as cheApi } from '@eclipse-che/api';
import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { Plugin } from '@theia/plugin-ext/lib/common/plugin-api-rpc';
import { CheWorkspaceImpl } from './che-workspace';
import { CheVariablesImpl } from './che-variables';
import { PLUGIN_RPC_CONTEXT } from '../common/che-protocol';
import { CheFactoryImpl } from './che-factory';
import { CheDevfileImpl } from './che-devfile';
import { CheTaskImpl } from './che-task-impl';
import { CheSshImpl } from './che-ssh';
import { CheUserImpl } from './che-user';
import { CheProductImpl } from './che-product';
import { CheSideCarContentReaderImpl } from './che-sidecar-content-reader';
import { CheGithubImpl } from './che-github';

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
    const cheUserImpl = rpc.set(PLUGIN_RPC_CONTEXT.CHE_USER, new CheUserImpl(rpc));
    rpc.set(PLUGIN_RPC_CONTEXT.CHE_SIDERCAR_CONTENT_READER, new CheSideCarContentReaderImpl(rpc));

    const cheProductImpl = rpc.set(PLUGIN_RPC_CONTEXT.CHE_PRODUCT, new CheProductImpl(rpc));

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
            // tslint:disable-next-line: no-any
            create(config: cheApi.workspace.WorkspaceConfig, params: che.KeyValue): Promise<any> {
                return cheWorkspaceImpl.create(config, params);
            },
            // tslint:disable-next-line: no-any
            update(workspaceId: string, workspaceObj: cheApi.workspace.Workspace): Promise<any> {
                return cheWorkspaceImpl.update(workspaceId, workspaceObj);
            },
            // tslint:disable-next-line: no-any
            deleteWorkspace(workspaceId: string): Promise<any> {
                return cheWorkspaceImpl.deleteWorkspace(workspaceId);
            },
            // tslint:disable-next-line: no-any
            start(workspaceId: string, environmentName: string): Promise<any> {
                return cheWorkspaceImpl.start(workspaceId, environmentName);
            },
            // tslint:disable-next-line: no-any
            startTemporary(config: cheApi.workspace.WorkspaceConfig): Promise<any> {
                return cheWorkspaceImpl.startTemporary(config);
            },
            // tslint:disable-next-line: no-any
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
            github
        };
    };

}
