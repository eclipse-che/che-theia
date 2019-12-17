/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { PluginHandleRegistry } from './plugin-handle-registry';
import { interfaces } from 'inversify';
import { TestAPI } from '../common/test-protocol';
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

/**
 * This class redirects language api requests to the correct sidecars and returns the results
 */
export class TestAPIImpl implements TestAPI {

    private readonly pluginHandleRegistry: PluginHandleRegistry;

    constructor(container: interfaces.Container) {
        this.pluginHandleRegistry = container.get(PluginHandleRegistry);
    }

    async $provideCompletionItems(pluginID: string, resource: UriComponents, position: Position,
        context: CompletionContext, token: CancellationToken): Promise<CompletionResultDto | undefined> {
        const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'completion');
        return languagesExt.$provideCompletionItems(handle, resource, position, context, token);
    }

    async $provideDefinition(pluginID: string, resource: UriComponents, position: Position, token: CancellationToken): Promise<Definition | DefinitionLink[] | undefined> {
        const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'definition');
        return languagesExt.$provideDefinition(handle, resource, position, token);
    }

    async $provideDeclaration(pluginID: string, resource: UriComponents, position: Position, token: CancellationToken): Promise<Definition | DefinitionLink[] | undefined> {
        const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'declaration');
        return languagesExt.$provideDeclaration(handle, resource, position, token);
    }

    async $provideSignatureHelp(pluginID: string, resource: UriComponents, position: Position, context: SignatureHelpContext, token: CancellationToken
    ): Promise<SignatureHelp | undefined> {
        const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'signatureHelp');
        return languagesExt.$provideSignatureHelp(handle, resource, position, context, token);
    }

    async $provideImplementation(pluginID: string, resource: UriComponents, position: Position, token: CancellationToken): Promise<Definition | DefinitionLink[] | undefined> {
        const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'implementation');
        return languagesExt.$provideImplementation(handle, resource, position, token);
    }

    async $provideTypeDefinition(pluginID: string, resource: UriComponents, position: Position, token: CancellationToken): Promise<Definition | DefinitionLink[] | undefined> {
        const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'typeDefinition');
        return languagesExt.$provideTypeDefinition(handle, resource, position, token);
    }

    async $provideHover(pluginID: string, resource: UriComponents, position: Position, token: CancellationToken): Promise<Hover | undefined> {
        const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'hover');
        return languagesExt.$provideHover(handle, resource, position, token);
    }

    async $provideDocumentHighlights(pluginID: string, resource: UriComponents, position: Position, token: CancellationToken): Promise<DocumentHighlight[] | undefined> {
        const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'documentHighlight');
        return languagesExt.$provideDocumentHighlights(handle, resource, position, token);
    }

    $provideWorkspaceSymbols(pluginID: string, query: string, token: CancellationToken): PromiseLike<SymbolInformation[]> {
        return this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'workspaceSymbols').then(({ languagesExt, handle }) =>
            languagesExt.$provideWorkspaceSymbols(handle, query, token)
        );
    }

    async $provideDocumentFormattingEdits(pluginID: string, resource: UriComponents,
        options: FormattingOptions, token: CancellationToken): Promise<TextEdit[] | undefined> {
        const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'documentFormattingEdits');
        return languagesExt.$provideDocumentFormattingEdits(handle, resource, options, token);
    }

    // tslint:disable-next-line:no-any
    async $provideDocumentRangeFormattingEdits(pluginID: string, resource: UriComponents, range: Range,
        options: FormattingOptions, token: CancellationToken): Promise<TextEdit[] | undefined> {
        const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'documentRangeFormattingEdits');
        return languagesExt.$provideDocumentRangeFormattingEdits(handle, resource, range, options, token);
    }

    async $provideOnTypeFormattingEdits(pluginID: string,
        resource: UriComponents,
        position: Position,
        ch: string,
        options: FormattingOptions,
        token: CancellationToken
    ): Promise<TextEdit[] | undefined> {
        const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'onTypeFormattingEdits');
        return languagesExt.$provideOnTypeFormattingEdits(handle, resource, position, ch, options, token);
    }

    async $provideDocumentLinks(pluginID: string, resource: UriComponents, token: CancellationToken): Promise<DocumentLink[] | undefined> {
        const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'documentLinks');
        return languagesExt.$provideDocumentLinks(handle, resource, token);
    }

    // tslint:disable-next-line:no-any
    async $provideCodeActions(pluginID: string,
        resource: UriComponents,
        rangeOrSelection: Range | Selection,
        context: CodeActionContext,
        token: CancellationToken
    ): Promise<CodeAction[] | undefined> {
        const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'codeActions');
        return languagesExt.$provideCodeActions(handle, resource, rangeOrSelection, context, token);
    }

    async $provideCodeLenses(pluginID: string, resource: UriComponents, token: CancellationToken): Promise<CodeLensSymbol[] | undefined> {
        const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'codeLenses');
        return languagesExt.$provideCodeLenses(handle, resource, token);
    }

    async $provideReferences(pluginID: string, resource: UriComponents, position: Position, context: ReferenceContext, token: CancellationToken): Promise<Location[] | undefined> {
        const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'references');
        return languagesExt.$provideReferences(handle, resource, position, context, token);
    }

    $provideDocumentColors(pluginID: string, resource: UriComponents, token: CancellationToken): PromiseLike<RawColorInfo[]> {
        return this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'documentColors').then(({ languagesExt, handle }) =>
            languagesExt.$provideDocumentColors(handle, resource, token)
        );
    }

    $provideFoldingRange(pluginID: string,
        resource: UriComponents,
        context: FoldingContext,
        token: CancellationToken
    ): PromiseLike<FoldingRange[] | undefined> {
        return this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'foldingRange').then(({ languagesExt, handle }) =>
            languagesExt.$provideFoldingRange(handle, resource, context, token)
        );
    }

    $provideRenameEdits(pluginID: string, resource: UriComponents, position: Position, newName: string, token: CancellationToken): PromiseLike<WorkspaceEditDto | undefined> {
        return this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'renameEdits').then(({ languagesExt, handle }) =>
            languagesExt.$provideRenameEdits(handle, resource, position, newName, token)
        );
    }

    async $provideDocumentSymbols(pluginID: string, resource: UriComponents, token: CancellationToken): Promise<DocumentSymbol[] | undefined> {
        const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(pluginID, 'symbols');
        return languagesExt.$provideDocumentSymbols(handle, resource, token);
    }
}
