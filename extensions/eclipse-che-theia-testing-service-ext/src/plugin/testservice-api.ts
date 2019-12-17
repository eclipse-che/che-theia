/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { Plugin } from '@theia/plugin-ext/lib/common/plugin-api-rpc';
import * as testservice from '@eclipse-che/testing-service';
import { PLUGIN_RPC_CONTEXT, TestAPI } from '../common/test-protocol';
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
    DefinitionLink,
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
import { CancellationToken, FoldingContext } from '@theia/plugin';
import { SymbolInformation } from 'vscode-languageserver-types';
import {
    Position,
    Selection,
    RawColorInfo,
    WorkspaceEditDto
} from '@theia/plugin-ext/lib/common/plugin-api-rpc';

export interface TestApiFactory {
    (plugin: Plugin): typeof testservice;
}

export function createAPIFactory(rpc: RPCProtocol): TestApiFactory {

    return function (plugin: Plugin): typeof testservice {

        const testAPI = rpc.getProxy(PLUGIN_RPC_CONTEXT.TEST_API_MAIN) as TestAPI;

        const languageserver: typeof testservice.languageserver = {

            completion(pluginID: string, resource: UriComponents, position: Position,
                context: CompletionContext, token: CancellationToken): Promise<CompletionResultDto | undefined> {
                return testAPI.$provideCompletionItems(pluginID, resource, position, context, token);
            },
            implementation(pluginID: string, resource: UriComponents, position: Position, token: CancellationToken): Promise<Definition | DefinitionLink[] | undefined> {
                return testAPI.$provideImplementation(pluginID, resource, position, token);
            },
            typeDefinition(pluginID: string, resource: UriComponents, position: Position, token: CancellationToken): Promise<Definition | DefinitionLink[] | undefined> {
                return testAPI.$provideTypeDefinition(pluginID, resource, position, token);
            },
            definition(pluginID: string, resource: UriComponents, position: Position, token: CancellationToken): Promise<Definition | DefinitionLink[] | undefined> {
                return testAPI.$provideDefinition(pluginID, resource, position, token);
            },
            declaration(pluginID: string, resource: UriComponents, position: Position, token: CancellationToken): Promise<Definition | DefinitionLink[] | undefined> {
                return testAPI.$provideDeclaration(pluginID, resource, position, token);
            },
            references(pluginID: string, resource: UriComponents, position: Position, context: ReferenceContext, token: CancellationToken): Promise<Location[] | undefined> {
                return testAPI.$provideReferences(pluginID, resource, position, context, token);
            },
            signatureHelp(
                pluginID: string, resource: UriComponents, position: Position, context: SignatureHelpContext, token: CancellationToken
            ): Promise<SignatureHelp | undefined> {
                return testAPI.$provideSignatureHelp(pluginID, resource, position, context, token);
            },
            hover(pluginID: string, resource: UriComponents, position: Position, token: CancellationToken): Promise<Hover | undefined> {
                return testAPI.$provideHover(pluginID, resource, position, token);
            },
            documentHighlights(pluginID: string, resource: UriComponents, position: Position, token: CancellationToken): Promise<DocumentHighlight[] | undefined> {
                return testAPI.$provideDocumentHighlights(pluginID, resource, position, token);
            },
            documentFormattingEdits(pluginID: string, resource: UriComponents,
                options: FormattingOptions, token: CancellationToken): Promise<TextEdit[] | undefined> {
                return testAPI.$provideDocumentFormattingEdits(pluginID, resource, options, token);
            },
            documentRangeFormattingEdits(pluginID: string, resource: UriComponents, range: Range,
                options: FormattingOptions, token: CancellationToken): Promise<TextEdit[] | undefined> {
                return testAPI.$provideDocumentRangeFormattingEdits(pluginID, resource, range, options, token);
            },
            onTypeFormattingEdits(
                pluginID: string,
                resource: UriComponents,
                position: Position,
                ch: string,
                options: FormattingOptions,
                token: CancellationToken
            ): Promise<TextEdit[] | undefined> {
                return testAPI.$provideOnTypeFormattingEdits(pluginID, resource, position, ch, options, token);
            },
            documentLinks(pluginID: string, resource: UriComponents, token: CancellationToken): Promise<DocumentLink[] | undefined> {
                return testAPI.$provideDocumentLinks(pluginID, resource, token);
            },
            codeLenses(pluginID: string, resource: UriComponents, token: CancellationToken): Promise<CodeLensSymbol[] | undefined> {
                return testAPI.$provideCodeLenses(pluginID, resource, token);
            },
            codeActions(
                pluginID: string,
                resource: UriComponents,
                rangeOrSelection: Range | Selection,
                context: CodeActionContext,
                token: CancellationToken
            ): Promise<CodeAction[] | undefined> {
                return testAPI.$provideCodeActions(pluginID, resource, rangeOrSelection, context, token);
            },
            documentSymbols(pluginID: string, resource: UriComponents, token: CancellationToken): Promise<DocumentSymbol[] | undefined> {
                return testAPI.$provideDocumentSymbols(pluginID, resource, token);
            },
            workspaceSymbols(pluginID: string, query: string, token: CancellationToken): PromiseLike<SymbolInformation[]> {
                return testAPI.$provideWorkspaceSymbols(pluginID, query, token);
            },
            foldingRange(
                pluginID: string,
                resource: UriComponents,
                context: FoldingContext,
                token: CancellationToken
            ): PromiseLike<FoldingRange[] | undefined> {
                return testAPI.$provideFoldingRange(pluginID, resource, context, token);
            },
            documentColors(pluginID: string, resource: UriComponents, token: CancellationToken): PromiseLike<RawColorInfo[]> {
                return testAPI.$provideDocumentColors(pluginID, resource, token);
            },
            renameEdits(pluginID: string, resource: UriComponents, position: Position, newName: string, token: CancellationToken): PromiseLike<WorkspaceEditDto | undefined> {
                return testAPI.$provideRenameEdits(pluginID, resource, position, newName, token);
            }
        };

        return <typeof testservice>{
            languageserver
        };

    };
}
