/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as theia from '@theia/plugin';
import { DocumentsExtImpl } from '@theia/plugin-ext/lib/plugin/documents';
import { URI } from 'vscode-uri';
import { overrideUri } from './che-content-aware-utils';

export class DocumentContainerAware {

    static makeDocumentContainerAware(documentExt: DocumentsExtImpl): void {
        const documentContainerAware = new DocumentContainerAware();
        documentContainerAware.overrideGetDocumentData(documentExt);
        documentContainerAware.overrideOpenDocument(documentExt);
        documentContainerAware.overrideShowDocument(documentExt);
    }

    overrideOpenDocument(documentExt: DocumentsExtImpl): void {
        const originalOpenDocument = documentExt.openDocument.bind(documentExt);
        const openDocument = (uri: URI) => originalOpenDocument(overrideUri(uri));
        documentExt.openDocument = openDocument;
    }

    overrideShowDocument(documentExt: DocumentsExtImpl): void {
        const originalShowDocument = documentExt.showDocument.bind(documentExt);
        const showDocument = (uri: URI, options?: theia.TextDocumentShowOptions) => originalShowDocument(overrideUri(uri), options);
        documentExt.showDocument = showDocument;
    }

    overrideGetDocumentData(documentExt: DocumentsExtImpl): void {
        const originalGetDocumentData = documentExt.getDocumentData.bind(documentExt);
        const getDocumentData = (resource: theia.Uri) => originalGetDocumentData(overrideUri(resource));
        documentExt.getDocumentData = getDocumentData;
    }
}
