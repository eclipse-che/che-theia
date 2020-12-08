/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/
import * as jsoncparser from 'jsonc-parser';

import { DisposableCollection, ResourceProvider } from '@theia/core/lib/common';
import {
  MonacoSnippetSuggestProvider,
  SnippetLoadOptions,
} from '@theia/monaco/lib/browser/monaco-snippet-suggest-provider';
import { inject, injectable } from 'inversify';

import URI from '@theia/core/lib/common/uri';

/**
 * Override the loading of snippet resources to use resources instead of file system.
 */
@injectable()
export class CheSnippetSuggestProvider extends MonacoSnippetSuggestProvider {
  @inject(ResourceProvider)
  protected readonly resourceProvider: ResourceProvider;

  protected async loadURI(
    uri: string | URI,
    options: SnippetLoadOptions,
    toDispose: DisposableCollection
  ): Promise<void> {
    const resourceUri = typeof uri === 'string' ? new URI(uri) : uri;
    const resource = await this.resourceProvider(resourceUri);
    try {
      const value = await resource.readContents();
      if (toDispose.disposed) {
        return;
      }
      const snippets = value && jsoncparser.parse(value, undefined, { disallowComments: false });
      toDispose.push(this.fromJSON(snippets, options));
    } finally {
      resource.dispose();
    }
  }
}
