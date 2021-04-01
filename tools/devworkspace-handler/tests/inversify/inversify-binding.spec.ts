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

import * as axios from 'axios';
import * as fs from 'fs-extra';

import { InversifyBinding, InversifyBindingOptions } from '../../src/inversify/inversify-binding';

import { CheTheiaComponentFinder } from '../../src/devfile/che-theia-component-finder';
import { CheTheiaComponentUpdater } from '../../src/devfile/che-theia-component-updater';
import { CheTheiaPluginDevContainerMerger } from '../../src/devfile/che-theia-plugin-devcontainer-merger';
import { CheTheiaPluginSidecarMerger } from '../../src/devfile/che-theia-plugin-sidecar-merger';
import { CheTheiaPluginsAnalyzer } from '../../src/devfile/che-theia-plugins-analyzer';
import { CheTheiaPluginsDevfileResolver } from '../../src/devfile/che-theia-plugins-devfile-resolver';
import { Container } from 'inversify';
import { ContainerPluginRemoteUpdater } from '../../src/devfile/container-plugin-remote-updater';
import { DevContainerComponentFinder } from '../../src/devfile/dev-container-component-finder';
import { DevContainerComponentUpdater } from '../../src/devfile/dev-container-component-updater';
import { DevWorkspaceUpdater } from '../../src/devfile/devworkspace-updater';
import { Generate } from '../../src/generate';
import { GithubResolver } from '../../src/github/github-resolver';
import { PluginRegistryResolver } from '../../src/plugin-registry/plugin-registry-resolver';
import { SidecarComponentsCreator } from '../../src/devfile/sidecar-components-creator';
import { UrlFetcher } from '../../src/fetch/url-fetcher';
import { VscodeExtensionJsonAnalyzer } from '../../src/devfile/vscode-extension-json-analyzer';
import { VsixInstallerComponentUpdater } from '../../src/vsix-installer/vsix-installer-component-updater';

describe('Test InversifyBinding', () => {
  const mockedArgv: string[] = ['dummy', 'dummy'];
  const originalProcessArgv = process.argv;

  beforeEach(() => {
    mockedArgv.length = 2;
    process.argv = mockedArgv;
    const fsMkdirsSpy = jest.spyOn(fs, 'mkdirs');
    fsMkdirsSpy.mockReturnValue();
  });
  afterEach(() => (process.argv = originalProcessArgv));

  test('default', async () => {
    const inversifyBinding = new InversifyBinding();

    const axiosInstance = axios.default;
    const options: InversifyBindingOptions = {
      pluginRegistryUrl: 'http://fake-registry',
      axiosInstance,
      insertTemplates: false,
    };

    const container: Container = await inversifyBinding.initBindings(options);
    container.bind(Generate).toSelf().inSingletonScope();

    expect(inversifyBinding).toBeDefined();

    // check devfile module
    expect(container.get(CheTheiaComponentFinder)).toBeDefined();
    expect(container.get(CheTheiaComponentUpdater)).toBeDefined();
    expect(container.get(CheTheiaPluginDevContainerMerger)).toBeDefined();
    expect(container.get(CheTheiaPluginSidecarMerger)).toBeDefined();
    expect(container.get(CheTheiaPluginsAnalyzer)).toBeDefined();
    expect(container.get(CheTheiaPluginsDevfileResolver)).toBeDefined();
    expect(container.get(ContainerPluginRemoteUpdater)).toBeDefined();
    expect(container.get(DevContainerComponentFinder)).toBeDefined();
    expect(container.get(DevContainerComponentUpdater)).toBeDefined();
    expect(container.get(DevWorkspaceUpdater)).toBeDefined();
    expect(container.get(SidecarComponentsCreator)).toBeDefined();
    expect(container.get(VscodeExtensionJsonAnalyzer)).toBeDefined();

    // check fetch module
    expect(container.get(UrlFetcher)).toBeDefined();

    // check github module
    expect(container.get(GithubResolver)).toBeDefined();

    // check plugin-registry module
    expect(container.get(PluginRegistryResolver)).toBeDefined();

    // check vsix-installer module
    expect(container.get(VsixInstallerComponentUpdater)).toBeDefined();

    // check main module
    expect(container.get(Generate)).toBeDefined();
  });
});
