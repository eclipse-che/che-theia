/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { ChePluginHandleRegistry } from './che-plugin-handle-registry';
import { interfaces } from 'inversify';
import { CheLanguagesTestAPI } from '../common/che-languages-test-protocol';
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

/**
 * This class redirects language api requests to the correct sidecars and returns the results
 */
export class CheLanguagesTestAPIImpl implements CheLanguagesTestAPI {

    private readonly pluginHandleRegistry: ChePluginHandleRegistry;

    constructor(container: interfaces.Container) {
        this.pluginHandleRegistry = container.get(ChePluginHandleRegistry);
    }

    async $provideCompletionItems(pluginID: string, resource: Uri, position: Position,
        context: CompletionContext, token: CancellationToken): Promise<CompletionResultDto | undefined> {
        const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'completion');
        return languagesExt.$provideCompletionItems(handle, resource, position, context, token);
    }

    async $provideDefinition(pluginID: string, resource: Uri, position: Position, token: CancellationToken): Promise<Definition | undefined> {
        const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'definition');
        return languagesExt.$provideDefinition(handle, resource, position, token);
    }

    async $provideDeclaration(pluginID: string, resource: Uri, position: Position, token: CancellationToken): Promise<Definition | undefined> {
        const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'declaration');
        return languagesExt.$provideDeclaration(handle, resource, position, token);
    }

    async $provideSignatureHelp(pluginID: string, resource: Uri, position: Position, context: SignatureHelpContext, token: CancellationToken
    ): Promise<SignatureHelp | undefined> {
        const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'signatureHelp');
        return languagesExt.$provideSignatureHelp(handle, resource, position, context, token);
    }

    async $provideImplementation(pluginID: string, resource: Uri, position: Position, token: CancellationToken): Promise<Definition | undefined> {
        const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'implementation');
        return languagesExt.$provideImplementation(handle, resource, position, token);
    }

    async $provideTypeDefinition(pluginID: string, resource: Uri, position: Position, token: CancellationToken): Promise<Definition | undefined> {
        const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'typeDefinition');
        return languagesExt.$provideTypeDefinition(handle, resource, position, token);
    }

    async $provideHover(pluginID: string, resource: Uri, position: Position, token: CancellationToken): Promise<Hover | undefined> {
        const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'hover');
        return languagesExt.$provideHover(handle, resource, position, token);
    }

    async $provideDocumentHighlights(pluginID: string, resource: Uri, position: Position, token: CancellationToken): Promise<DocumentHighlight[] | undefined> {
        const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'documentHighlight');
        return languagesExt.$provideDocumentHighlights(handle, resource, position, token);
    }

    $provideWorkspaceSymbols(pluginID: string, query: string, token: CancellationToken): PromiseLike<SymbolInformation[]> {
        return this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'workspaceSymbols').then(({ languagesExt, handle }) =>
            languagesExt.$provideWorkspaceSymbols(handle, query, token)
        );
    }

    async $provideDocumentFormattingEdits(pluginID: string, resource: Uri,
        options: FormattingOptions, token: CancellationToken): Promise<TextEdit[] | undefined> {
        const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'documentFormattingEdits');
        return languagesExt.$provideDocumentFormattingEdits(handle, resource, options, token);
    }

    async $provideDocumentRangeFormattingEdits(pluginID: string, resource: Uri, range: Range,
        options: FormattingOptions, token: CancellationToken): Promise<TextEdit[] | undefined> {
        const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'documentRangeFormattingEdits');
        return languagesExt.$provideDocumentRangeFormattingEdits(handle, resource, range, options, token);
    }

    async $provideOnTypeFormattingEdits(pluginID: string,
        resource: Uri,
        position: Position,
        ch: string,
        options: FormattingOptions,
        token: CancellationToken
    ): Promise<TextEdit[] | undefined> {
        const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'onTypeFormattingEdits');
        return languagesExt.$provideOnTypeFormattingEdits(handle, resource, position, ch, options, token);
    }

    async $provideDocumentLinks(pluginID: string, resource: Uri, token: CancellationToken): Promise<DocumentLink[] | undefined> {
        const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'documentLinks');
        return languagesExt.$provideDocumentLinks(handle, resource, token);
    }

    async $provideCodeActions(pluginID: string,
        resource: Uri,
        rangeOrSelection: Range | Selection,
        context: CodeActionContext,
        token: CancellationToken
    ): Promise<CodeAction[] | undefined> {
        const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'codeActions');
        return languagesExt.$provideCodeActions(handle, resource, rangeOrSelection, context, token);
    }

    async $provideCodeLenses(pluginID: string, resource: Uri, token: CancellationToken): Promise<CodeLensSymbol[] | undefined> {
        const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'codeLenses');
        return languagesExt.$provideCodeLenses(handle, resource, token);
    }

    async $provideReferences(pluginID: string, resource: Uri, position: Position, context: ReferenceContext, token: CancellationToken): Promise<Location[] | undefined> {
        const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'references');
        return languagesExt.$provideReferences(handle, resource, position, context, token);
    }

    $provideDocumentColors(pluginID: string, resource: Uri, token: CancellationToken): PromiseLike<RawColorInfo[]> {
        return this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'documentColors').then(({ languagesExt, handle }) =>
            languagesExt.$provideDocumentColors(handle, resource, token)
        );
    }

    $provideFoldingRange(pluginID: string,
        resource: Uri,
        context: FoldingContext,
        token: CancellationToken
    ): PromiseLike<FoldingRange[] | undefined> {
        return this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'foldingRange').then(({ languagesExt, handle }) =>
            languagesExt.$provideFoldingRange(handle, resource, context, token)
        );
    }

    $provideRenameEdits(pluginID: string, resource: Uri, position: Position, newName: string, token: CancellationToken): PromiseLike<WorkspaceEditDto | undefined> {
        return this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'renameEdits').then(({ languagesExt, handle }) =>
            languagesExt.$provideRenameEdits(handle, resource, position, newName, token)
        );
    }

    async $provideDocumentSymbols(pluginID: string, resource: Uri, token: CancellationToken): Promise<DocumentSymbol[] | undefined> {
        const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'symbols');
        return languagesExt.$provideDocumentSymbols(handle, resource, token);
    }
}
