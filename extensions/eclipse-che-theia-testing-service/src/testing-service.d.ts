/********************************************************************************
 * Copyright (C) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import * as vst from 'vscode-languageserver-types';
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

declare module '@eclipse-che/testing-service' {

    export namespace languageserver {
        export function completion(pluginID: string, resource: UriComponents, position: Position,
            context: CompletionContext, token: CancellationToken): Promise<CompletionResultDto | undefined>;
        export function implementation(pluginID: string, resource: UriComponents, position: Position, token: CancellationToken): Promise<Definition | DefinitionLink[] | undefined>;
        export function typeDefinition(pluginID: string, resource: UriComponents, position: Position, token: CancellationToken): Promise<Definition | DefinitionLink[] | undefined>;
        export function definition(pluginID: string, resource: UriComponents, position: Position, token: CancellationToken): Promise<Definition | DefinitionLink[] | undefined>;
        export function declaration(pluginID: string, resource: UriComponents, position: Position, token: CancellationToken): Promise<Definition | DefinitionLink[] | undefined>;
        export function references(pluginID: string, resource: UriComponents, position: Position, context: ReferenceContext, token: CancellationToken): Promise<Location[] | undefined>;
        export function signatureHelp(
            pluginID: string, resource: UriComponents, position: Position, context: SignatureHelpContext, token: CancellationToken
        ): Promise<SignatureHelp | undefined>;
        export function hover(pluginID: string, resource: UriComponents, position: Position, token: CancellationToken): Promise<Hover | undefined>;
        export function documentHighlights(pluginID: string, resource: UriComponents, position: Position, token: CancellationToken): Promise<DocumentHighlight[] | undefined>;
        export function documentFormattingEdits(pluginID: string, resource: UriComponents,
            options: FormattingOptions, token: CancellationToken): Promise<TextEdit[] | undefined>;
        export function documentRangeFormattingEdits(pluginID: string, resource: UriComponents, range: Range,
            options: FormattingOptions, token: CancellationToken): Promise<TextEdit[] | undefined>;
        export function onTypeFormattingEdits(
            pluginID: string,
            resource: UriComponents,
            position: Position,
            ch: string,
            options: FormattingOptions,
            token: CancellationToken
        ): Promise<TextEdit[] | undefined>;
        export function documentLinks(pluginID: string, resource: UriComponents, token: CancellationToken): Promise<DocumentLink[] | undefined>;
        export function codeLenses(pluginID: string, resource: UriComponents, token: CancellationToken): Promise<CodeLensSymbol[] | undefined>;
        export function codeActions(
            pluginID: string,
            resource: UriComponents,
            rangeOrSelection: Range | Selection,
            context: CodeActionContext,
            token: CancellationToken
        ): Promise<CodeAction[] | undefined>;
        export function documentSymbols(pluginID: string, resource: UriComponents, token: CancellationToken): Promise<DocumentSymbol[] | undefined>;
        export function workspaceSymbols(pluginID: string, query: string, token: CancellationToken): PromiseLike<SymbolInformation[]>;
        export function foldingRange(
            pluginID: string,
            resource: UriComponents,
            context: FoldingContext,
            token: CancellationToken
        ): PromiseLike<FoldingRange[] | undefined>;
        export function documentColors(pluginID: string, resource: UriComponents, token: CancellationToken): PromiseLike<RawColorInfo[]>;
        export function renameEdits(pluginID: string, resource: UriComponents, position: Position, newName: string, token: CancellationToken): PromiseLike<WorkspaceEditDto | undefined>;
    }

}
