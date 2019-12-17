/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { injectable, inject } from 'inversify';
import { PluginInfo, LanguagesExt, MAIN_RPC_CONTEXT } from '@theia/plugin-ext/lib/common/plugin-api-rpc';
import { SerializedDocumentFilter, MarkerData } from '@theia/plugin-ext/lib/common/plugin-api-rpc-model';
import { LanguagesMainImpl } from '@theia/plugin-ext/lib/main/browser/languages-main';
import * as theia from '@theia/plugin';
import { PluginHandleRegistry } from './plugin-handle-registry';
import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { LanguagesMain, SerializedLanguageConfiguration } from '@theia/plugin-ext/lib/common/plugin-api-rpc';
import { UriComponents } from '@theia/plugin-ext/lib/common/uri-components';

export type LanguageServerAction = string;
export type LanguageServerActions =
    'completion' |
    'definition' |
    'declaration' |
    'signatureHelp' |
    'implementation' |
    'typeDefinition' |
    'hover' |
    'quickFix' |
    'documentHighlight' |
    'workspaceSymbols' |
    'documentFormattingEdits' |
    'documentRangeFormattingEdits' |
    'onTypeFormattingEdits' |
    'documentLinks' |
    'codeActions' |
    'codeLenses' |
    'references' |
    'symbols' |
    'documentColors' |
    'foldingRange' |
    'renameEdits';

@injectable()
export class LanguagesMainTestImpl implements LanguagesMain {

    @inject(LanguagesMainImpl)
    private readonly languagesMainImpl: LanguagesMainImpl;

    @inject(PluginHandleRegistry)
    private readonly pluginHandleRegistry: PluginHandleRegistry;

    private readonly languagesExtProxy: LanguagesExt;

    constructor(@inject(RPCProtocol) rpc: RPCProtocol) {
        this.languagesExtProxy = rpc.getProxy(MAIN_RPC_CONTEXT.LANGUAGES_EXT);
    }

    $getLanguages(): Promise<string[]> {
        return this.languagesMainImpl.$getLanguages();
    }

    $changeLanguage(resource: UriComponents, languageId: string): Promise<void> {
        return this.languagesMainImpl.$changeLanguage(resource, languageId);
    }

    $setLanguageConfiguration(handle: number, languageId: string, configuration: SerializedLanguageConfiguration): void {
        this.languagesMainImpl.$setLanguageConfiguration(handle, languageId, configuration);
    }

    $unregister(handle: number): void {
        this.languagesMainImpl.$unregister(handle);
    }

    $clearDiagnostics(id: string): void {
        this.languagesMainImpl.$clearDiagnostics(id);
    }

    $changeDiagnostics(id: string, delta: [string, MarkerData[]][]): void {
        this.languagesMainImpl.$changeDiagnostics(id, delta);
    }

    // tslint:disable-next-line: no-any
    $emitCodeLensEvent(eventHandle: number, event?: any): void {
        this.languagesMainImpl.$emitCodeLensEvent(eventHandle, event);
    }

    $registerCompletionSupport(handle: number, pluginInfo: PluginInfo,
        selector: SerializedDocumentFilter[], triggerCharacters: string[], supportsResolveDetails: boolean): void {
        this.pluginHandleRegistry.registerPluginWithFeatureHandle(handle, pluginInfo.id, 'completion', this.languagesExtProxy);
        this.languagesMainImpl.$registerCompletionSupport(handle, pluginInfo, selector, triggerCharacters, supportsResolveDetails);
    }

    $registerDefinitionProvider(handle: number, pluginInfo: PluginInfo, selector: SerializedDocumentFilter[]): void {
        this.pluginHandleRegistry.registerPluginWithFeatureHandle(handle, pluginInfo.id, 'definition', this.languagesExtProxy);
        this.languagesMainImpl.$registerDefinitionProvider(handle, pluginInfo, selector);
    }

    $registerDeclarationProvider(handle: number, pluginInfo: PluginInfo, selector: SerializedDocumentFilter[]): void {
        this.pluginHandleRegistry.registerPluginWithFeatureHandle(handle, pluginInfo.id, 'declaration', this.languagesExtProxy);
        this.languagesMainImpl.$registerDeclarationProvider(handle, pluginInfo, selector);
    }

    $registerReferenceProvider(handle: number, pluginInfo: PluginInfo, selector: SerializedDocumentFilter[]): void {
        this.pluginHandleRegistry.registerPluginWithFeatureHandle(handle, pluginInfo.id, 'references', this.languagesExtProxy);
        this.languagesMainImpl.$registerReferenceProvider(handle, pluginInfo, selector);
    }

    $registerSignatureHelpProvider(handle: number, pluginInfo: PluginInfo, selector: SerializedDocumentFilter[], metadata: theia.SignatureHelpProviderMetadata): void {
        this.pluginHandleRegistry.registerPluginWithFeatureHandle(handle, pluginInfo.id, 'signatureHelp', this.languagesExtProxy);
        this.languagesMainImpl.$registerSignatureHelpProvider(handle, pluginInfo, selector, metadata);
    }

    $registerImplementationProvider(handle: number, pluginInfo: PluginInfo, selector: SerializedDocumentFilter[]): void {
        this.pluginHandleRegistry.registerPluginWithFeatureHandle(handle, pluginInfo.id, 'implementation', this.languagesExtProxy);
        this.languagesMainImpl.$registerImplementationProvider(handle, pluginInfo, selector);
    }

    $registerTypeDefinitionProvider(handle: number, pluginInfo: PluginInfo, selector: SerializedDocumentFilter[]): void {
        this.pluginHandleRegistry.registerPluginWithFeatureHandle(handle, pluginInfo.id, 'typeDefinition', this.languagesExtProxy);
        this.languagesMainImpl.$registerTypeDefinitionProvider(handle, pluginInfo, selector);
    }

    $registerHoverProvider(handle: number, pluginInfo: PluginInfo, selector: SerializedDocumentFilter[]): void {
        this.pluginHandleRegistry.registerPluginWithFeatureHandle(handle, pluginInfo.id, 'hover', this.languagesExtProxy);
        this.languagesMainImpl.$registerHoverProvider(handle, pluginInfo, selector);
    }

    $registerQuickFixProvider(handle: number, pluginInfo: PluginInfo, selector: SerializedDocumentFilter[], codeActionKinds?: string[] | undefined): void {
        this.pluginHandleRegistry.registerPluginWithFeatureHandle(handle, pluginInfo.id, 'quickFix', this.languagesExtProxy);
        this.languagesMainImpl.$registerQuickFixProvider(handle, pluginInfo, selector);
    }

    $registerDocumentHighlightProvider(handle: number, pluginInfo: PluginInfo, selector: SerializedDocumentFilter[]): void {
        this.pluginHandleRegistry.registerPluginWithFeatureHandle(handle, pluginInfo.id, 'documentHighlight', this.languagesExtProxy);
        this.languagesMainImpl.$registerDocumentHighlightProvider(handle, pluginInfo, selector);
    }

    $registerWorkspaceSymbolProvider(handle: number, pluginInfo: PluginInfo): void {
        this.pluginHandleRegistry.registerPluginWithFeatureHandle(handle, pluginInfo.id, 'workspaceSymbols', this.languagesExtProxy);
        this.languagesMainImpl.$registerWorkspaceSymbolProvider(handle, pluginInfo);
    }

    $registerDocumentLinkProvider(handle: number, pluginInfo: PluginInfo, selector: SerializedDocumentFilter[]): void {
        this.pluginHandleRegistry.registerPluginWithFeatureHandle(handle, pluginInfo.id, 'documentLinks', this.languagesExtProxy);
        this.languagesMainImpl.$registerDocumentLinkProvider(handle, pluginInfo, selector);
    }

    $registerCodeLensSupport(handle: number, pluginInfo: PluginInfo, selector: SerializedDocumentFilter[], eventHandle: number): void {
        this.pluginHandleRegistry.registerPluginWithFeatureHandle(handle, pluginInfo.id, 'codeLenses', this.languagesExtProxy);
        this.languagesMainImpl.$registerCodeLensSupport(handle, pluginInfo, selector, eventHandle);
    }

    $registerOutlineSupport(handle: number, pluginInfo: PluginInfo, selector: SerializedDocumentFilter[]): void {
        this.pluginHandleRegistry.registerPluginWithFeatureHandle(handle, pluginInfo.id, 'symbols', this.languagesExtProxy);
        this.languagesMainImpl.$registerOutlineSupport(handle, pluginInfo, selector);
    }

    $registerDocumentFormattingSupport(handle: number, pluginInfo: PluginInfo, selector: SerializedDocumentFilter[]): void {
        this.pluginHandleRegistry.registerPluginWithFeatureHandle(handle, pluginInfo.id, 'documentFormattingEdits', this.languagesExtProxy);
        this.languagesMainImpl.$registerDocumentFormattingSupport(handle, pluginInfo, selector);
    }

    $registerRangeFormattingProvider(handle: number, pluginInfo: PluginInfo, selector: SerializedDocumentFilter[]): void {
        this.pluginHandleRegistry.registerPluginWithFeatureHandle(handle, pluginInfo.id, 'documentRangeFormattingEdits', this.languagesExtProxy);
        this.languagesMainImpl.$registerRangeFormattingProvider(handle, pluginInfo, selector);
    }

    $registerOnTypeFormattingProvider(handle: number, pluginInfo: PluginInfo, selector: SerializedDocumentFilter[], autoFormatTriggerCharacters: string[]): void {
        this.pluginHandleRegistry.registerPluginWithFeatureHandle(handle, pluginInfo.id, 'onTypeFormattingEdits', this.languagesExtProxy);
        this.languagesMainImpl.$registerOnTypeFormattingProvider(handle, pluginInfo, selector, autoFormatTriggerCharacters);
    }

    $registerFoldingRangeProvider(handle: number, pluginInfo: PluginInfo, selector: SerializedDocumentFilter[]): void {
        this.pluginHandleRegistry.registerPluginWithFeatureHandle(handle, pluginInfo.id, 'foldingRange', this.languagesExtProxy);
        this.languagesMainImpl.$registerFoldingRangeProvider(handle, pluginInfo, selector);
    }

    $registerDocumentColorProvider(handle: number, pluginInfo: PluginInfo, selector: SerializedDocumentFilter[]): void {
        this.pluginHandleRegistry.registerPluginWithFeatureHandle(handle, pluginInfo.id, 'documentColors', this.languagesExtProxy);
        this.languagesMainImpl.$registerDocumentColorProvider(handle, pluginInfo, selector);
    }

    $registerRenameProvider(handle: number, pluginInfo: PluginInfo, selector: SerializedDocumentFilter[], supportsResolveLocation: boolean): void {
        this.pluginHandleRegistry.registerPluginWithFeatureHandle(handle, pluginInfo.id, 'renameEdits', this.languagesExtProxy);
        this.languagesMainImpl.$registerRenameProvider(handle, pluginInfo, selector, supportsResolveLocation);
    }

    $registerCallHierarchyProvider(handle: number, selector: SerializedDocumentFilter[]): void {
        // This doesnt have pluginInfo so it cannot register with the pluginHandleRegistry for now
        this.languagesMainImpl.$registerCallHierarchyProvider(handle, selector);
    }

}
