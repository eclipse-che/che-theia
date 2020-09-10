/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as model from '@theia/plugin-ext/lib/common/plugin-api-rpc-model';
import { SymbolInformation } from 'vscode-languageserver-types';
import * as theia from '@theia/plugin';
import * as types from '@theia/plugin-ext/lib/plugin/types-impl';
import * as Converter from '@theia/plugin-ext/lib/plugin/type-converters';
import { URI } from 'vscode-uri';
import { Selection, Position, RawColorInfo, WorkspaceFileEditDto, WorkspaceTextEditDto } from '@theia/plugin-ext/lib/common/plugin-api-rpc';

export function toWorkspaceEdit(workspaceEdit: model.WorkspaceEdit): theia.WorkspaceEdit {
    const result: theia.WorkspaceEdit = new types.WorkspaceEdit();
    const edits = workspaceEdit.edits;

    for (const entry of edits) {
        if (entry.hasOwnProperty('oldUri')) {
            const fileEdit = entry as WorkspaceFileEditDto;
            const oldUri = URI.revive(fileEdit.oldUri);
            const newUri = URI.revive(fileEdit.newUri);
            if (oldUri && newUri) {
                result.renameFile(oldUri, newUri, fileEdit.options);
            }
        } else {
            const textEdit = entry as WorkspaceTextEditDto;
            result.set(URI.revive(textEdit.resource), [toTextEdit(textEdit.edit)]);
        }
    }
    return result;
}

export function toCompletionList(completionResultDTO: model.CompletionResultDto): theia.CompletionList {
    const result: theia.CompletionList = {
        items: []
    };
    if (completionResultDTO.hasOwnProperty('incomplete')) {
        result.isIncomplete = completionResultDTO.incomplete;
    }
    result.items = completionResultDTO.completions.map(toCompletionItem);
    return result;
}

export function toCompletionItem(completionDTO: model.CompletionDto): theia.CompletionItem {
    let range: theia.CompletionItem['range'] | undefined;
    const itemRange = completionDTO.range;
    if (!itemRange) {
        range = undefined;
    } else if (itemRange.hasOwnProperty('insert') && itemRange.hasOwnProperty('replace')) {
        const inserting = Converter.toRange((itemRange as unknown as {
            insert: model.Range;
            replace: model.Range;
        }).insert);
        const replacing = Converter.toRange((itemRange as unknown as {
            insert: model.Range;
            replace: model.Range;
        }).replace);
        range = {
            inserting: inserting,
            replacing: replacing
        };
    } else {
        range = Converter.toRange(itemRange as model.Range);
    }

    return {
        label: completionDTO.label,
        range: range,
        additionalTextEdits: completionDTO.additionalTextEdits && completionDTO.additionalTextEdits.map(toTextEdit),
        command: toCommand(completionDTO.command),
        commitCharacters: completionDTO.commitCharacters,
        detail: completionDTO.detail,
        filterText: completionDTO.filterText,
        insertText: completionDTO.insertText,
        keepWhitespace: completionDTO.insertTextRules ? true : false,
        kind: Converter.toCompletionItemKind(completionDTO.kind),
        preselect: completionDTO.preselect,
        sortText: completionDTO.sortText,
    };
}

export function toHover(hover: model.Hover): theia.Hover {
    let range = undefined;
    if (hover.range) {
        range = Converter.toRange(hover.range);
    }
    const markdown = hover.contents.map(Converter.toMarkdown);
    return <theia.Hover>{
        range: range,
        contents: markdown
    };
}

export function toFoldingRange(foldingRange: model.FoldingRange): theia.FoldingRange {
    const range: theia.FoldingRange = {
        start: foldingRange.start - 1,
        end: foldingRange.end - 1
    };
    if (foldingRange.kind) {
        range.kind = toFoldingRangeKind(foldingRange.kind);
    }
    return range;
}

export function toDocumentLink(link: model.DocumentLink): theia.DocumentLink {
    let target = undefined;
    if (link.url) {
        try {
            target = typeof link.url === 'string' ? URI.parse(link.url, true) : URI.revive(link.url);
        } catch (err) {
            console.error(err);
        }
    }
    return {
        range: Converter.toRange(link.range),
        target: target
    };
}

export function toFoldingRangeKind(kind: model.FoldingRangeKind | undefined): theia.FoldingRangeKind | undefined {
    if (kind) {
        switch (kind) {
            case model.FoldingRangeKind.Comment:
                return types.FoldingRangeKind.Comment;
            case model.FoldingRangeKind.Imports:
                return types.FoldingRangeKind.Imports;
            case model.FoldingRangeKind.Region:
                return types.FoldingRangeKind.Region;
        }
    }
    return undefined;
}

export function toCodeLens(lenses: model.CodeLensSymbol): theia.CodeLens {
    return {
        range: Converter.toRange(lenses.range),
        command: lenses.command,
        isResolved: true
    };
}

export function toDefinition(definition: model.Definition): theia.Definition | theia.DefinitionLink[] | undefined {
    if (isLocationLinkArray(definition)) {
        const definitionLinks: theia.DefinitionLink[] = [];
        for (const location of definition) {
            definitionLinks.push(toDefinitionLink(location));
        }
        return definitionLinks;
    } else if (isLocationArray(definition)) {
        const locations: theia.Location[] = [];
        for (const location of definition) {
            locations.push(Converter.toLocation(location));
        }
        return locations;
    } else {
        return Converter.toLocation(definition);
    }
}

export function toDefinitionLink(locationLink: model.LocationLink): theia.DefinitionLink {
    return <theia.DefinitionLink>{
        targetUri: Converter.toLocation(locationLink as model.Location).uri,
        targetRange: Converter.toRange(locationLink.range),
        originSelectionRange: locationLink.originSelectionRange ? Converter.toRange(locationLink.originSelectionRange) : undefined,
        targetSelectionRange: locationLink.targetSelectionRange ? Converter.toRange(locationLink.targetSelectionRange) : undefined
    };
}

export function toTextEdit(edit: model.TextEdit): theia.TextEdit {
    return {
        newText: edit.text,
        range: Converter.toRange(edit.range),
        newEol: edit.eol === 1 ? 2 : 1
    };
}

export function toSignatureHelp(signatureHelp: model.SignatureHelp): theia.SignatureHelp {
    return Converter.SignatureHelp.to(signatureHelp);
}

export function toDocumentSymbol(symbol: model.DocumentSymbol): theia.DocumentSymbol {
    return Converter.toDocumentSymbol(symbol);
}

export function toSymbolInformation(symbolInformation: SymbolInformation): theia.SymbolInformation | undefined {
    return Converter.toSymbolInformation(symbolInformation);
}

export function toLocation(location: model.Location): theia.Location {
    return Converter.toLocation(location);
}

export function toDocumentHighlight(documentHighlight: model.DocumentHighlight): theia.DocumentHighlight {
    return <theia.DocumentHighlight>{
        range: Converter.toRange(documentHighlight.range),
        kind: toDocumentHighlightKind(documentHighlight.kind)
    };
}

export function toDocumentHighlightKind(kind: model.DocumentHighlightKind | undefined): types.DocumentHighlightKind {
    switch (kind) {
        case model.DocumentHighlightKind.Text: return types.DocumentHighlightKind.Text;
        case model.DocumentHighlightKind.Read: return types.DocumentHighlightKind.Read;
        case model.DocumentHighlightKind.Write: return types.DocumentHighlightKind.Write;
    };
    return types.DocumentHighlightKind.Text;
}

export function toCodeAction(action: model.CodeAction): theia.CodeAction {
    return {
        title: action.title,
        command: toCommand(action.command),
        diagnostics: toDiagnostics(action.diagnostics),
        kind: action.kind ? new types.CodeActionKind(action.kind) : undefined,
        edit: action.edit ? toWorkspaceEdit(action.edit) : undefined
    };
}

export function toCommand(command: model.Command | undefined): theia.Command | undefined {
    if (!command) {
        return undefined;
    }
    return {
        id: command.id,
        title: command.title,
        arguments: command.arguments,
        tooltip: command.tooltip
    };
}

export function toDiagnostics(diagnostics: model.MarkerData[] | undefined): theia.Diagnostic[] | undefined {
    return diagnostics ? diagnostics.map(toDiagnostic) : undefined;
}

export function fromRange(range: theia.Range): model.Range {
    return Converter.fromRange(range);
}

export function fromPosition(position: theia.Position): Position {
    return { lineNumber: position.line + 1, column: position.character + 1 };
}

export function toColorInformation(rawColorInfo: RawColorInfo): theia.ColorInformation {
    return {
        color: Converter.toColor(rawColorInfo.color),
        range: Converter.toRange(rawColorInfo.range)
    };
}

export function fromCodeActionContext(context: theia.CodeActionContext): model.CodeActionContext {
    return {
        only: context.only?.value
    };
}

export function fromSelection(selection: theia.Selection): Selection {
    const { active, anchor } = selection;
    return {
        selectionStartLineNumber: anchor.line + 1,
        selectionStartColumn: anchor.character + 1,
        positionLineNumber: active.line + 1,
        positionColumn: active.character + 1
    };
}

export function toDiagnostic(marker: model.MarkerData): theia.Diagnostic {
    return {
        message: marker.message,
        range: Converter.toRange({
            startLineNumber: marker.startLineNumber,
            startColumn: marker.startColumn,
            endLineNumber: marker.endLineNumber,
            endColumn: marker.endColumn
        }),
        severity: toDiagnosticSeverity(marker.severity),
        code: marker.code,
        source: marker.source,
        relatedInformation: toDiagnosticRelatedInformation(marker.relatedInformation),
        tags: toDiagnosticTags(marker.tags)
    };
}

export function toDiagnosticSeverity(severity: types.MarkerSeverity): types.DiagnosticSeverity {
    switch (severity) {
        case types.MarkerSeverity.Error: return types.DiagnosticSeverity.Error;
        case types.MarkerSeverity.Warning: return types.DiagnosticSeverity.Warning;
        case types.MarkerSeverity.Info: return types.DiagnosticSeverity.Information;
        case types.MarkerSeverity.Hint: return types.DiagnosticSeverity.Hint;
    };
}

export function toDiagnosticRelatedInformation(relatedInformation: model.RelatedInformation[] | undefined): theia.DiagnosticRelatedInformation[] | undefined {
    if (!relatedInformation) {
        return undefined;
    }
    const diagnosticRelatedInformation: theia.DiagnosticRelatedInformation[] = [];
    for (const item of relatedInformation) {
        const location: theia.Location = {
            uri: URI.parse(item.resource),
            range: Converter.toRange({
                startLineNumber: item.startLineNumber,
                startColumn: item.startColumn,
                endLineNumber: item.endLineNumber,
                endColumn: item.endColumn
            })
        };
        diagnosticRelatedInformation.push({
            location: location,
            message: item.message
        });
    }
    return diagnosticRelatedInformation;
}

function toDiagnosticTags(tags: types.MarkerTag[] | undefined): types.DiagnosticTag[] | undefined {
    if (!tags) {
        return undefined;
    }

    const diagnosticTags: theia.DiagnosticTag[] = [];
    for (const tag of tags) {
        if (tag === types.MarkerTag.Unnecessary) {
            diagnosticTags.push(types.DiagnosticTag.Unnecessary);
        }
    }
    return diagnosticTags;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isLocationArray(array: any): array is model.Location[] {
    return Array.isArray(array) && array.length > 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isLocationLinkArray(array: any): array is model.LocationLink[] {
    return Array.isArray(array) && array.length > 0 && array[0].hasOwnProperty('originSelectionRange') && array[0].hasOwnProperty('targetSelectionRange');
}

// Try to restore Position object from its serialized content
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function revivePosition(position: any): theia.Position {
    if (!position || !position._line || !position._character) {
        throw new Error('Not able to restore position');
    }
    const result: theia.Position = new types.Position(position._line, position._character);
    return result;
}

// Try to restore Range object from its serialized content
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function reviveRange(range: any): theia.Range {
    if (!range || !range._start || !range._end) {
        throw new Error('Not able to restore range');
    }
    const start = revivePosition(range._start);
    const end = revivePosition(range._end);
    const result: theia.Range = new types.Range(start.line, start.character, end.line, end.character);
    return result;
}

// Try to restore Selection object from its serialized content
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function reviveSelection(selection: any): theia.Selection {
    if (!selection || !selection._anchor || !selection._active) {
        throw new Error('Not able to restore selection');
    }
    const anchor = revivePosition(selection._anchor);
    const active = revivePosition(selection._active);
    const result: theia.Selection = new types.Selection(anchor.line, anchor.character, active.line, active.character);
    return result;
}
