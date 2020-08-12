/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

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
import { CancellationToken, FoldingContext, Uri } from '@theia/plugin';
import { SymbolInformation } from 'vscode-languageserver-types';
import {
    Position,
    Selection,
    RawColorInfo,
    WorkspaceEditDto
} from '@theia/plugin-ext/lib/common/plugin-api-rpc';

// Expose additional API that allows you to know if a language server is connected and build a map of the language servers
export interface CheLanguagesTestAPI {
    $provideCompletionItems(pluginID: string, resource: Uri, position: Position,
        context: CompletionContext, token: CancellationToken): Promise<CompletionResultDto | undefined>;
    $provideImplementation(pluginID: string, resource: Uri, position: Position, token: CancellationToken): Promise<Definition | undefined>;
    $provideTypeDefinition(pluginID: string, resource: Uri, position: Position, token: CancellationToken): Promise<Definition | undefined>;
    $provideDefinition(pluginID: string, resource: Uri, position: Position, token: CancellationToken): Promise<Definition | undefined>;
    $provideDeclaration(pluginID: string, resource: Uri, position: Position, token: CancellationToken): Promise<Definition | undefined>;
    $provideReferences(pluginID: string, resource: Uri, position: Position, context: ReferenceContext, token: CancellationToken): Promise<Location[] | undefined>;
    $provideSignatureHelp(
        pluginID: string, resource: Uri, position: Position, context: SignatureHelpContext, token: CancellationToken
    ): Promise<SignatureHelp | undefined>;
    $provideHover(pluginID: string, resource: Uri, position: Position, token: CancellationToken): Promise<Hover | undefined>;
    $provideDocumentHighlights(pluginID: string, resource: Uri, position: Position, token: CancellationToken): Promise<DocumentHighlight[] | undefined>;
    $provideDocumentFormattingEdits(pluginID: string, resource: Uri,
        options: FormattingOptions, token: CancellationToken): Promise<TextEdit[] | undefined>;
    $provideDocumentRangeFormattingEdits(pluginID: string, resource: Uri, range: Range,
        options: FormattingOptions, token: CancellationToken): Promise<TextEdit[] | undefined>;
    $provideOnTypeFormattingEdits(
        pluginID: string,
        resource: Uri,
        position: Position,
        ch: string,
        options: FormattingOptions,
        token: CancellationToken
    ): Promise<TextEdit[] | undefined>;
    $provideDocumentLinks(pluginID: string, resource: Uri, token: CancellationToken): Promise<DocumentLink[] | undefined>;
    $provideCodeLenses(pluginID: string, resource: Uri, token: CancellationToken): Promise<CodeLensSymbol[] | undefined>;
    $provideCodeActions(
        pluginID: string,
        resource: Uri,
        rangeOrSelection: Range | Selection,
        context: CodeActionContext,
        token: CancellationToken
    ): Promise<CodeAction[] | undefined>;
    $provideDocumentSymbols(pluginID: string, resource: Uri, token: CancellationToken): Promise<DocumentSymbol[] | undefined>;
    $provideWorkspaceSymbols(pluginID: string, query: string, token: CancellationToken): PromiseLike<SymbolInformation[]>;
    $provideFoldingRange(
        pluginID: string,
        resource: Uri,
        context: FoldingContext,
        token: CancellationToken
    ): PromiseLike<FoldingRange[] | undefined>;
    $provideDocumentColors(pluginID: string, resource: Uri, token: CancellationToken): PromiseLike<RawColorInfo[]>;
    $provideRenameEdits(pluginID: string, resource: Uri, position: Position, newName: string, token: CancellationToken): PromiseLike<WorkspaceEditDto | undefined>;
}
