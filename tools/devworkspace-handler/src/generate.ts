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

import * as fs from 'fs-extra';
import * as jsYaml from 'js-yaml';

import { V1alpha2DevWorkspace, V1alpha2DevWorkspaceTemplate, V1alpha2DevWorkspaceTemplateSpec } from '@devfile/api';
import { inject, injectable } from 'inversify';

import { CheTheiaPluginsDevfileResolver } from './devfile/che-theia-plugins-devfile-resolver';
import { GithubResolver } from './github/github-resolver';
import { PluginRegistryResolver } from './plugin-registry/plugin-registry-resolver';
import { SidecarPolicy } from './api/devfile-context';
import { UrlFetcher } from './fetch/url-fetcher';

@injectable()
export class Generate {
  @inject(UrlFetcher)
  private urlFetcher: UrlFetcher;

  @inject(CheTheiaPluginsDevfileResolver)
  private cheTheiaPluginsDevfileResolver: CheTheiaPluginsDevfileResolver;

  @inject(PluginRegistryResolver)
  private pluginRegistryResolver: PluginRegistryResolver;

  @inject(GithubResolver)
  private githubResolver: GithubResolver;

  async generate(
    devfileUrl: string,
    editorEntry: string,
    sidecarPolicy: SidecarPolicy,
    outputFile: string
  ): Promise<void> {
    // gets the github URL
    const githubUrl = this.githubResolver.resolve(devfileUrl);

    // user devfile
    const userDevfileContent = await this.urlFetcher.fetchText(githubUrl.getContentUrl('devfile.yaml'));
    const devfile = jsYaml.load(userDevfileContent);
    // sets the suffix to the devfile name
    const suffix = devfile.metadata.name || '';

    // devfile of the editor
    const editorDevfile = await this.pluginRegistryResolver.loadDevfilePlugin(editorEntry);

    // transform it into a devWorkspace template
    const metadata = editorDevfile.metadata;
    // add sufix
    metadata.name = `${metadata.name}-${suffix}`;
    delete editorDevfile.metadata;
    delete editorDevfile.schemaVersion;
    const editorDevWorkspaceTemplate: V1alpha2DevWorkspaceTemplate = {
      apiVersion: 'workspace.devfile.io/v1alpha2',
      kind: 'DevWorkspaceTemplate',
      metadata,
      spec: editorDevfile as V1alpha2DevWorkspaceTemplateSpec,
    };

    // grab the content of the .vscode/extensions.json and .che/che-theia-plugins.yaml files
    const vscodeExtensionsJsonContent = await this.urlFetcher.fetchTextOptionalContent(
      githubUrl.getContentUrl('.vscode/extensions.json')
    );
    const cheTheiaPluginsContent = await this.urlFetcher.fetchTextOptionalContent(
      githubUrl.getContentUrl('.che/che-theia-plugins.yaml')
    );

    // transform it into a devWorkspace
    const devfileMetadata = devfile.metadata;

    delete devfile.schemaVersion;
    delete devfile.metadata;
    const devWorkspace: V1alpha2DevWorkspace = {
      apiVersion: 'workspace.devfile.io/v1alpha2',
      kind: 'DevWorkspace',
      metadata: devfileMetadata,
      spec: {
        started: true,
        template: devfile,
      },
    };

    // for now the list of devWorkspace templates is only the editor template
    const devWorkspaceTemplates = [editorDevWorkspaceTemplate];

    await this.cheTheiaPluginsDevfileResolver.handle({
      devfile: userDevfileContent,
      vscodeExtensionsJsonContent,
      cheTheiaPluginsContent,
      devWorkspace,
      devWorkspaceTemplates,
      sidecarPolicy,
      suffix,
    });

    // write templates and then DevWorkspace in a single file
    const allContentArray = devWorkspaceTemplates.map(template => jsYaml.dump(template));
    allContentArray.push(jsYaml.dump(devWorkspace));

    const generatedContent = allContentArray.join('---\n');

    await fs.writeFile(outputFile, generatedContent, 'utf-8');
  }
}
