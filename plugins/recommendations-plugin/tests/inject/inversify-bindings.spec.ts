/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import 'reflect-metadata';

import { ChePluginRegistry } from '../../src/registry/che-plugin-registry';
import { Container } from 'inversify';
import { DevfileHandler } from '../../src/devfile/devfile-handler';
import { FeaturedFetcher } from '../../src/fetch/featured-fetcher';
import { FeaturedPluginStrategy } from '../../src/strategy/featured-plugin-strategy';
import { FindFileExtensions } from '../../src/find/find-file-extensions';
import { InversifyBinding } from '../../src/inject/inversify-bindings';
import { PluginsByLanguageFetcher } from '../../src/fetch/plugins-by-language-fetcher';
import { RecommendPluginOpenFileStrategy } from '../../src/strategy/recommend-plugin-open-file-strategy';
import { RecommendationsPlugin } from '../../src/plugin/recommendations-plugin';
import { VSCodeCurrentExtensions } from '../../src/analyzer/vscode-current-extensions';
import { WorkspaceHandler } from '../../src/workspace/workspace-handler';

describe('Test InversifyBinding', () => {
  test('bindings', async () => {
    const inversifyBinding = new InversifyBinding();
    const container: Container = inversifyBinding.initBindings();

    expect(inversifyBinding).toBeDefined();

    // check analyzer
    expect(container.get(VSCodeCurrentExtensions)).toBeDefined();

    // check devfile
    expect(container.get(DevfileHandler)).toBeDefined();

    // check fetch
    expect(container.get(FeaturedFetcher)).toBeDefined();
    expect(container.get(PluginsByLanguageFetcher)).toBeDefined();

    // check find
    expect(container.get(FindFileExtensions)).toBeDefined();

    // check strategy
    expect(container.get(FeaturedPluginStrategy)).toBeDefined();
    expect(container.get(RecommendPluginOpenFileStrategy)).toBeDefined();

    // check plugin
    expect(container.get(RecommendationsPlugin)).toBeDefined();

    // check registry
    expect(container.get(ChePluginRegistry)).toBeDefined();

    // check workspace
    expect(container.get(WorkspaceHandler)).toBeDefined();
  });
});
