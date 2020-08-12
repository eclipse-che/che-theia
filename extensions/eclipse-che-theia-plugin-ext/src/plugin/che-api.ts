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
import * as theia from '@theia/plugin';
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
import { CheTaskImpl, TaskStatus, TaskTerminallKind } from './che-task-impl';
import { CheTelemetryImpl } from './che-telemetry';
import { CheUserImpl } from './che-user';
import { CheVariablesImpl } from './che-variables';
import { CheWorkspaceImpl } from './che-workspace';
import { CheOpenshiftImpl } from './che-openshift';
import { CheOauthImpl } from './che-oauth';
import { Disposable } from '@theia/core';
import {
    CompletionContext,
    CompletionResultDto,
    SignatureHelp,
    Hover,
    DocumentHighlight,
    Range,
    TextEdit,
    FormattingOptions,
    Definition,
    DocumentLink,
    CodeLensSymbol,
    DocumentSymbol,
    ReferenceContext,
    Location,
    SignatureHelpContext,
    CodeActionContext,
    CodeAction,
    FoldingRange,
} from '@theia/plugin-ext/lib/common/plugin-api-rpc-model';
import { UriComponents } from '@theia/plugin-ext/lib/common/uri-components';
import { SymbolInformation } from 'vscode-languageserver-types';
import {
    Position,
    Selection,
    RawColorInfo,
    WorkspaceEditDto
} from '@theia/plugin-ext/lib/common/plugin-api-rpc';

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

    const languageTestAPI = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_LANGUAGES_TEST_API_MAIN);

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
            getCurrentUser(): Promise<che.User> {
                return cheUserImpl.getCurrentUser();
            },
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

        const languagesTest: typeof che.languages.test = {

            completion(pluginID: string, resource: UriComponents, position: Position,
                context: CompletionContext, token: theia.CancellationToken): Promise<CompletionResultDto | undefined> {
                return languageTestAPI.$provideCompletionItems(pluginID, resource, position, context, token);
            },
            implementation(pluginID: string, resource: UriComponents, position: Position, token: theia.CancellationToken): Promise<Definition | undefined> {
                return languageTestAPI.$provideImplementation(pluginID, resource, position, token);
            },
            typeDefinition(pluginID: string, resource: UriComponents, position: Position, token: theia.CancellationToken): Promise<Definition | undefined> {
                return languageTestAPI.$provideTypeDefinition(pluginID, resource, position, token);
            },
            definition(pluginID: string, resource: UriComponents, position: Position, token: theia.CancellationToken): Promise<Definition | undefined> {
                return languageTestAPI.$provideDefinition(pluginID, resource, position, token);
            },
            declaration(pluginID: string, resource: UriComponents, position: Position, token: theia.CancellationToken): Promise<Definition | undefined> {
                return languageTestAPI.$provideDeclaration(pluginID, resource, position, token);
            },
            references(pluginID: string, resource: UriComponents, position: Position, context: ReferenceContext, token: theia.CancellationToken): Promise<Location[] | undefined> {
                return languageTestAPI.$provideReferences(pluginID, resource, position, context, token);
            },
            signatureHelp(
                pluginID: string, resource: UriComponents, position: Position, context: SignatureHelpContext, token: theia.CancellationToken
            ): Promise<SignatureHelp | undefined> {
                return languageTestAPI.$provideSignatureHelp(pluginID, resource, position, context, token);
            },
            hover(pluginID: string, resource: UriComponents, position: Position, token: theia.CancellationToken): Promise<Hover | undefined> {
                return languageTestAPI.$provideHover(pluginID, resource, position, token);
            },
            documentHighlights(pluginID: string, resource: UriComponents, position: Position, token: theia.CancellationToken): Promise<DocumentHighlight[] | undefined> {
                return languageTestAPI.$provideDocumentHighlights(pluginID, resource, position, token);
            },
            documentFormattingEdits(pluginID: string, resource: UriComponents,
                options: FormattingOptions, token: theia.CancellationToken): Promise<TextEdit[] | undefined> {
                return languageTestAPI.$provideDocumentFormattingEdits(pluginID, resource, options, token);
            },
            documentRangeFormattingEdits(pluginID: string, resource: UriComponents, range: Range,
                options: FormattingOptions, token: theia.CancellationToken): Promise<TextEdit[] | undefined> {
                return languageTestAPI.$provideDocumentRangeFormattingEdits(pluginID, resource, range, options, token);
            },
            onTypeFormattingEdits(
                pluginID: string,
                resource: UriComponents,
                position: Position,
                ch: string,
                options: FormattingOptions,
                token: theia.CancellationToken
            ): Promise<TextEdit[] | undefined> {
                return languageTestAPI.$provideOnTypeFormattingEdits(pluginID, resource, position, ch, options, token);
            },
            documentLinks(pluginID: string, resource: UriComponents, token: theia.CancellationToken): Promise<DocumentLink[] | undefined> {
                return languageTestAPI.$provideDocumentLinks(pluginID, resource, token);
            },
            codeLenses(pluginID: string, resource: UriComponents, token: theia.CancellationToken): Promise<CodeLensSymbol[] | undefined> {
                return languageTestAPI.$provideCodeLenses(pluginID, resource, token);
            },
            codeActions(
                pluginID: string,
                resource: UriComponents,
                rangeOrSelection: Range | Selection,
                context: CodeActionContext,
                token: theia.CancellationToken
            ): Promise<CodeAction[] | undefined> {
                return languageTestAPI.$provideCodeActions(pluginID, resource, rangeOrSelection, context, token);
            },
            documentSymbols(pluginID: string, resource: UriComponents, token: theia.CancellationToken): Promise<DocumentSymbol[] | undefined> {
                return languageTestAPI.$provideDocumentSymbols(pluginID, resource, token);
            },
            workspaceSymbols(pluginID: string, query: string, token: theia.CancellationToken): PromiseLike<SymbolInformation[]> {
                return languageTestAPI.$provideWorkspaceSymbols(pluginID, query, token);
            },
            foldingRange(
                pluginID: string,
                resource: UriComponents,
                context: theia.FoldingContext,
                token: theia.CancellationToken
            ): PromiseLike<FoldingRange[] | undefined> {
                return languageTestAPI.$provideFoldingRange(pluginID, resource, context, token);
            },
            documentColors(pluginID: string, resource: UriComponents, token: theia.CancellationToken): PromiseLike<RawColorInfo[]> {
                return languageTestAPI.$provideDocumentColors(pluginID, resource, token);
            },
            renameEdits(pluginID: string, resource: UriComponents, position: Position, newName: string, token: theia.CancellationToken): PromiseLike<WorkspaceEditDto | undefined> {
                return languageTestAPI.$provideRenameEdits(pluginID, resource, position, newName, token);
            }
        };

        const languages: typeof che.languages = {
            test: languagesTest
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
            TaskStatus,
            TaskTerminallKind,
            languages
        };
    };

}
