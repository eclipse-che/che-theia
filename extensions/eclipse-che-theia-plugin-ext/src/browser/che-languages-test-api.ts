/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as Converter from './type-converters';

import {
  CancellationToken,
  CodeAction,
  CodeActionContext,
  CodeLens,
  ColorInformation,
  CompletionContext,
  CompletionList,
  Definition,
  DefinitionLink,
  DocumentHighlight,
  DocumentLink,
  DocumentSymbol,
  FoldingContext,
  FoldingRange,
  FormattingOptions,
  Hover,
  Location,
  Position,
  Range,
  ReferenceContext,
  Selection,
  SignatureHelp,
  SignatureHelpContext,
  SymbolInformation,
  TextEdit,
  Uri,
  WorkspaceEdit,
} from '@theia/plugin';

import { CheLanguagesTestAPI } from '../common/che-languages-test-protocol';
import { ChePluginHandleRegistry } from './che-plugin-handle-registry';
import { interfaces } from 'inversify';

/**
 * This class redirects language api requests to the correct sidecars and returns the results
 */
export class CheLanguagesTestAPIImpl implements CheLanguagesTestAPI {
  private readonly pluginHandleRegistry: ChePluginHandleRegistry;

  constructor(container: interfaces.Container) {
    this.pluginHandleRegistry = container.get(ChePluginHandleRegistry);
  }

  async $provideCompletionItems(
    pluginID: string,
    resource: Uri,
    position: Position,
    context: CompletionContext,
    token: CancellationToken
  ): Promise<CompletionList | undefined> {
    const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(
      pluginID,
      'completion'
    );
    const convertedPosition = Converter.fromPosition(Converter.revivePosition(position));
    return Promise.resolve(
      languagesExt.$provideCompletionItems(handle, resource, convertedPosition, context, token)
    ).then(completion => {
      if (!completion) {
        return undefined;
      } else {
        return Converter.toCompletionList(completion);
      }
    });
  }

  async $provideDefinition(
    pluginID: string,
    resource: Uri,
    position: Position,
    token: CancellationToken
  ): Promise<Definition | DefinitionLink[] | undefined> {
    const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(
      pluginID,
      'definition'
    );
    const convertedPosition = Converter.fromPosition(Converter.revivePosition(position));
    return Promise.resolve(languagesExt.$provideDefinition(handle, resource, convertedPosition, token)).then(
      definition => {
        if (!definition) {
          return undefined;
        } else {
          return Converter.toDefinition(definition);
        }
      }
    );
  }

  async $provideDeclaration(
    pluginID: string,
    resource: Uri,
    position: Position,
    token: CancellationToken
  ): Promise<Definition | DefinitionLink[] | undefined> {
    const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(
      pluginID,
      'declaration'
    );
    const convertedPosition = Converter.fromPosition(Converter.revivePosition(position));
    return Promise.resolve(languagesExt.$provideDeclaration(handle, resource, convertedPosition, token)).then(
      declaration => {
        if (!declaration) {
          return undefined;
        } else {
          return Converter.toDefinition(declaration);
        }
      }
    );
  }

  async $provideSignatureHelp(
    pluginID: string,
    resource: Uri,
    position: Position,
    context: SignatureHelpContext,
    token: CancellationToken
  ): Promise<SignatureHelp | undefined> {
    const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(
      pluginID,
      'signatureHelp'
    );
    const convertedPosition = Converter.fromPosition(Converter.revivePosition(position));
    return Promise.resolve(
      languagesExt.$provideSignatureHelp(handle, resource, convertedPosition, context, token)
    ).then(signatureHelp => {
      if (!signatureHelp) {
        return undefined;
      } else {
        return Converter.toSignatureHelp(signatureHelp);
      }
    });
  }

  async $provideImplementation(
    pluginID: string,
    resource: Uri,
    position: Position,
    token: CancellationToken
  ): Promise<Definition | DefinitionLink[] | undefined> {
    const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(
      pluginID,
      'implementation'
    );
    const convertedPosition = Converter.fromPosition(Converter.revivePosition(position));
    return Promise.resolve(languagesExt.$provideImplementation(handle, resource, convertedPosition, token)).then(
      implementation => {
        if (!implementation) {
          return undefined;
        } else {
          return Converter.toDefinition(implementation);
        }
      }
    );
  }

  async $provideTypeDefinition(
    pluginID: string,
    resource: Uri,
    position: Position,
    token: CancellationToken
  ): Promise<Definition | DefinitionLink[] | undefined> {
    const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(
      pluginID,
      'typeDefinition'
    );
    const convertedPosition = Converter.fromPosition(Converter.revivePosition(position));
    return Promise.resolve(languagesExt.$provideTypeDefinition(handle, resource, convertedPosition, token)).then(
      typeDefinition => {
        if (!typeDefinition) {
          return undefined;
        } else {
          return Converter.toDefinition(typeDefinition);
        }
      }
    );
  }

  async $provideHover(
    pluginID: string,
    resource: Uri,
    position: Position,
    token: CancellationToken
  ): Promise<Hover | undefined> {
    const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(
      pluginID,
      'hover'
    );
    const convertedPosition = Converter.fromPosition(Converter.revivePosition(position));
    return Promise.resolve(languagesExt.$provideHover(handle, resource, convertedPosition, token)).then(hover => {
      if (!hover) {
        return undefined;
      } else {
        return Converter.toHover(hover);
      }
    });
  }

  async $provideDocumentHighlights(
    pluginID: string,
    resource: Uri,
    position: Position,
    token: CancellationToken
  ): Promise<DocumentHighlight[] | undefined> {
    const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(
      pluginID,
      'documentHighlight'
    );
    const convertedPosition = Converter.fromPosition(Converter.revivePosition(position));
    return Promise.resolve(languagesExt.$provideDocumentHighlights(handle, resource, convertedPosition, token)).then(
      highlights => {
        if (!highlights) {
          return undefined;
        } else {
          return highlights.map(Converter.toDocumentHighlight);
        }
      }
    );
  }

  async $provideWorkspaceSymbols(
    pluginID: string,
    query: string,
    token: CancellationToken
  ): Promise<SymbolInformation[]> {
    const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(
      pluginID,
      'workspaceSymbols'
    );
    return Promise.resolve(languagesExt.$provideWorkspaceSymbols(handle, query, token)).then(workspaceSymbols => {
      if (!workspaceSymbols) {
        return [];
      } else {
        const newSymbols: SymbolInformation[] = [];
        for (const sym of workspaceSymbols) {
          const convertedSymbol = Converter.toSymbolInformation(sym);
          if (convertedSymbol) {
            newSymbols.push(convertedSymbol);
          }
        }
        return newSymbols;
      }
    });
  }

  async $provideDocumentFormattingEdits(
    pluginID: string,
    resource: Uri,
    options: FormattingOptions,
    token: CancellationToken
  ): Promise<TextEdit[] | undefined> {
    const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(
      pluginID,
      'documentFormattingEdits'
    );
    return Promise.resolve(languagesExt.$provideDocumentFormattingEdits(handle, resource, options, token)).then(
      edits => {
        if (!edits) {
          return undefined;
        } else {
          return edits.map(Converter.toTextEdit);
        }
      }
    );
  }

  async $provideDocumentRangeFormattingEdits(
    pluginID: string,
    resource: Uri,
    range: Range,
    options: FormattingOptions,
    token: CancellationToken
  ): Promise<TextEdit[] | undefined> {
    const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(
      pluginID,
      'documentRangeFormattingEdits'
    );
    const convertedRange = Converter.fromRange(Converter.reviveRange(range));
    return Promise.resolve(
      languagesExt.$provideDocumentRangeFormattingEdits(handle, resource, convertedRange, options, token)
    ).then(edits => {
      if (!edits) {
        return undefined;
      } else {
        return edits.map(Converter.toTextEdit);
      }
    });
  }

  async $provideOnTypeFormattingEdits(
    pluginID: string,
    resource: Uri,
    position: Position,
    ch: string,
    options: FormattingOptions,
    token: CancellationToken
  ): Promise<TextEdit[] | undefined> {
    const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(
      pluginID,
      'onTypeFormattingEdits'
    );
    const convertedPosition = Converter.fromPosition(Converter.revivePosition(position));
    return Promise.resolve(
      languagesExt.$provideOnTypeFormattingEdits(handle, resource, convertedPosition, ch, options, token)
    ).then(edits => {
      if (!edits) {
        return undefined;
      } else {
        return edits.map(Converter.toTextEdit);
      }
    });
  }

  async $provideDocumentLinks(
    pluginID: string,
    resource: Uri,
    token: CancellationToken
  ): Promise<DocumentLink[] | undefined> {
    const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(
      pluginID,
      'documentLinks'
    );
    return Promise.resolve(languagesExt.$provideDocumentLinks(handle, resource, token)).then(links => {
      if (!links) {
        return undefined;
      } else {
        return links.map(Converter.toDocumentLink);
      }
    });
  }

  async $provideCodeActions(
    pluginID: string,
    resource: Uri,
    rangeOrSelection: Range | Selection,
    context: CodeActionContext,
    token: CancellationToken
  ): Promise<CodeAction[] | undefined> {
    const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(
      pluginID,
      'codeActions'
    );
    const rangeOrSelectionParam =
      rangeOrSelection.hasOwnProperty('_anchor') && rangeOrSelection.hasOwnProperty('_active')
        ? Converter.fromSelection(Converter.reviveSelection(rangeOrSelection))
        : Converter.fromRange(Converter.reviveRange(rangeOrSelection));
    return Promise.resolve(
      languagesExt.$provideCodeActions(
        handle,
        resource,
        rangeOrSelectionParam,
        Converter.fromCodeActionContext(context),
        token
      )
    ).then(actions => {
      if (!actions) {
        return undefined;
      } else {
        return actions.map(Converter.toCodeAction);
      }
    });
  }

  async $provideCodeLenses(pluginID: string, resource: Uri, token: CancellationToken): Promise<CodeLens[] | undefined> {
    const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(
      pluginID,
      'codeLenses'
    );
    return Promise.resolve(languagesExt.$provideCodeLenses(handle, resource, token)).then(lenses => {
      if (!lenses) {
        return undefined;
      } else {
        return lenses.map(Converter.toCodeLens);
      }
    });
  }

  async $provideReferences(
    pluginID: string,
    resource: Uri,
    position: Position,
    context: ReferenceContext,
    token: CancellationToken
  ): Promise<Location[] | undefined> {
    const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(
      pluginID,
      'references'
    );
    const convertedPosition = Converter.fromPosition(Converter.revivePosition(position));
    return Promise.resolve(languagesExt.$provideReferences(handle, resource, convertedPosition, context, token)).then(
      locations => {
        if (!locations) {
          return undefined;
        } else {
          return locations.map(Converter.toLocation);
        }
      }
    );
  }

  async $provideDocumentColors(pluginID: string, resource: Uri, token: CancellationToken): Promise<ColorInformation[]> {
    const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(
      pluginID,
      'documentColors'
    );
    return Promise.resolve(languagesExt.$provideDocumentColors(handle, resource, token)).then(rawColorInfo =>
      rawColorInfo.map(Converter.toColorInformation)
    );
  }

  async $provideFoldingRange(
    pluginID: string,
    resource: Uri,
    context: FoldingContext,
    token: CancellationToken
  ): Promise<FoldingRange[] | undefined> {
    const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(
      pluginID,
      'foldingRange'
    );
    return Promise.resolve(languagesExt.$provideFoldingRange(handle, resource, context, token)).then(foldingRanges => {
      if (!foldingRanges) {
        return undefined;
      } else {
        return foldingRanges.map(Converter.toFoldingRange);
      }
    });
  }

  async $provideRenameEdits(
    pluginID: string,
    resource: Uri,
    position: Position,
    newName: string,
    token: CancellationToken
  ): Promise<WorkspaceEdit | undefined> {
    const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(
      pluginID,
      'renameEdits'
    );
    const convertedPosition = Converter.fromPosition(Converter.revivePosition(position));
    return Promise.resolve(languagesExt.$provideRenameEdits(handle, resource, convertedPosition, newName, token)).then(
      edits => {
        if (!edits) {
          return undefined;
        } else {
          return Converter.toWorkspaceEdit(edits);
        }
      }
    );
  }

  async $provideDocumentSymbols(
    pluginID: string,
    resource: Uri,
    token: CancellationToken
  ): Promise<DocumentSymbol[] | undefined> {
    const { languagesExt, handle } = await this.pluginHandleRegistry.lookupLanguagesExtForPluginAndAction(
      pluginID,
      'symbols'
    );
    return Promise.resolve(languagesExt.$provideDocumentSymbols(handle, resource, token)).then(documentSymbols => {
      if (!documentSymbols) {
        return undefined;
      } else {
        return documentSymbols.map(Converter.toDocumentSymbol);
      }
    });
  }
}
