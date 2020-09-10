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
    CancellationToken,
    FormattingOptions,
    CodeActionContext,
    CompletionContext,
    SignatureHelpContext,
    FoldingContext,
    ReferenceContext,
    Uri,
    CompletionList,
    DocumentHighlight,
    CodeLens,
    DocumentSymbol,
    DocumentLink,
    ColorInformation,
    TextEdit,
    Range,
    CodeAction,
    DefinitionLink,
    Definition,
    Hover,
    Position,
    Selection,
    SymbolInformation,
    FoldingRange,
    WorkspaceEdit,
    SignatureHelp,
    Location
} from '@theia/plugin';

// Expose additional API that allows you to know if a language server is connected and build a map of the language servers
export interface CheLanguagesTestAPI {
    $provideCompletionItems(
        pluginID: string,
        resource: Uri,
        position: Position,
        context: CompletionContext,
        token: CancellationToken
    ): Promise<CompletionList | undefined>;
    $provideImplementation(pluginID: string, resource: Uri, position: Position, token: CancellationToken): Promise<Definition | DefinitionLink[] | undefined>;
    $provideTypeDefinition(pluginID: string, resource: Uri, position: Position, token: CancellationToken): Promise<Definition | DefinitionLink[] | undefined>;
    $provideDefinition(pluginID: string, resource: Uri, position: Position, token: CancellationToken): Promise<Definition | DefinitionLink[] | undefined>;
    $provideDeclaration(pluginID: string, resource: Uri, position: Position, token: CancellationToken): Promise<Definition | DefinitionLink[] | undefined>;
    $provideReferences(pluginID: string, resource: Uri, position: Position, context: ReferenceContext, token: CancellationToken): Promise<Location[] | undefined>;
    $provideSignatureHelp(
        pluginID: string,
        resource: Uri,
        position: Position,
        context: SignatureHelpContext,
        token: CancellationToken
    ): Promise<SignatureHelp | undefined>;
    $provideHover(pluginID: string, resource: Uri, position: Position, token: CancellationToken): Promise<Hover | undefined>;
    $provideDocumentHighlights(pluginID: string, resource: Uri, position: Position, token: CancellationToken): Promise<DocumentHighlight[] | undefined>;
    $provideDocumentFormattingEdits(
        pluginID: string,
        resource: Uri,
        options: FormattingOptions,
        token: CancellationToken
    ): Promise<TextEdit[] | undefined>;
    $provideDocumentRangeFormattingEdits(
        pluginID: string,
        resource: Uri,
        range: Range,
        options: FormattingOptions,
        token: CancellationToken
    ): Promise<TextEdit[] | undefined>;
    $provideOnTypeFormattingEdits(
        pluginID: string,
        resource: Uri,
        position: Position,
        ch: string,
        options: FormattingOptions,
        token: CancellationToken
    ): Promise<TextEdit[] | undefined>;
    $provideDocumentLinks(pluginID: string, resource: Uri, token: CancellationToken): Promise<DocumentLink[] | undefined>;
    $provideCodeLenses(pluginID: string, resource: Uri, token: CancellationToken): Promise<CodeLens[] | undefined>;
    $provideCodeActions(
        pluginID: string,
        resource: Uri,
        rangeOrSelection: Range | Selection,
        context: CodeActionContext,
        token: CancellationToken
    ): Promise<CodeAction[] | undefined>;
    $provideDocumentSymbols(pluginID: string, resource: Uri, token: CancellationToken): Promise<DocumentSymbol[] | undefined>;
    $provideWorkspaceSymbols(pluginID: string, query: string, token: CancellationToken): Promise<SymbolInformation[]>;
    $provideFoldingRange(
        pluginID: string,
        resource: Uri,
        context: FoldingContext,
        token: CancellationToken
    ): Promise<FoldingRange[] | undefined>;
    $provideDocumentColors(pluginID: string, resource: Uri, token: CancellationToken): Promise<ColorInformation[]>;
    $provideRenameEdits(pluginID: string, resource: Uri, position: Position, newName: string, token: CancellationToken): Promise<WorkspaceEdit | undefined>;
}
