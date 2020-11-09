/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';

import * as fs from 'fs-extra';
import * as path from 'path';
import * as theia from '@theia/plugin';

import { Container } from 'inversify';
import { VSCodeCurrentExtensions } from '../../src/analyzer/vscode-current-extensions';

describe('Test VSCodeCurrentExtensions', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    jest.mock('axios');
    container.bind(VSCodeCurrentExtensions).toSelf().inSingletonScope();
  });

  test('analyze', async () => {
    const redhatJavaPackageJsonRaw = await fs.readFile(
      path.join(__dirname, '..', '_data', 'analyzer', 'redhat-java.json'),
      'utf8'
    );
    const msPythonPackageJsonRaw = await fs.readFile(
      path.join(__dirname, '..', '_data', 'analyzer', 'ms-python.json'),
      'utf8'
    );
    const sonarLintPackageJsonRaw = await fs.readFile(
      path.join(__dirname, '..', '_data', 'analyzer', 'sonarlint.json'),
      'utf8'
    );
    const noContributesPackageJsonRaw = await fs.readFile(
      path.join(__dirname, '..', '_data', 'analyzer', 'no-contributes.json'),
      'utf8'
    );
    const noContributesLanguagePackageJsonRaw = await fs.readFile(
      path.join(__dirname, '..', '_data', 'analyzer', 'no-contributes-languages.json'),
      'utf8'
    );
    const noContributesLanguageIdPackageJsonRaw = await fs.readFile(
      path.join(__dirname, '..', '_data', 'analyzer', 'no-contributes-languages-id.json'),
      'utf8'
    );
    const existingJavaPackageJsonRaw = await fs.readFile(
      path.join(__dirname, '..', '_data', 'analyzer', 'existing-java-language.json'),
      'utf8'
    );

    const redhatJavaPlugin = jest.fn() as any;
    redhatJavaPlugin.packageJSON = JSON.parse(redhatJavaPackageJsonRaw);

    const msPythonPlugin = jest.fn() as any;
    msPythonPlugin.packageJSON = JSON.parse(msPythonPackageJsonRaw);

    const sonarLintPlugin = jest.fn() as any;
    sonarLintPlugin.packageJSON = JSON.parse(sonarLintPackageJsonRaw);

    const noContributesPlugin = jest.fn() as any;
    noContributesPlugin.packageJSON = JSON.parse(noContributesPackageJsonRaw);

    const noContributesLanguagesPlugin = jest.fn() as any;
    noContributesLanguagesPlugin.packageJSON = JSON.parse(noContributesLanguagePackageJsonRaw);

    const noContributesLanguagesIdPlugin = jest.fn() as any;
    noContributesLanguagesIdPlugin.packageJSON = JSON.parse(noContributesLanguageIdPackageJsonRaw);

    const existingJavaPlugin = jest.fn() as any;
    existingJavaPlugin.packageJSON = JSON.parse(existingJavaPackageJsonRaw);

    // add twice the redhatJava plug-in
    theia.plugins.all = [
      redhatJavaPlugin,
      redhatJavaPlugin,
      msPythonPlugin,
      sonarLintPlugin,
      noContributesPlugin,
      noContributesLanguagesPlugin,
      noContributesLanguagesIdPlugin,
      existingJavaPlugin,
    ];
    theia.plugins.all.forEach(plugin => {
      (plugin as any).id = `${plugin.packageJSON.publisher}/${plugin.packageJSON.name}`;
    });

    const vsCodeCurrentExtensions = container.get(VSCodeCurrentExtensions);
    const vsCodeCurrentExtensionsLanguages = await vsCodeCurrentExtensions.analyze();
    expect(vsCodeCurrentExtensionsLanguages).toBeDefined();

    // test plugins by languages
    expect(vsCodeCurrentExtensionsLanguages.vscodeExtensionByLanguageId).toBeDefined();
    expect(vsCodeCurrentExtensionsLanguages.vscodeExtensionByLanguageId.has('java')).toBeTruthy();
    expect(vsCodeCurrentExtensionsLanguages.vscodeExtensionByLanguageId.has('javascript')).toBeTruthy();
    expect(vsCodeCurrentExtensionsLanguages.vscodeExtensionByLanguageId.has('python')).toBeTruthy();
    expect(
      vsCodeCurrentExtensionsLanguages.vscodeExtensionByLanguageId.get('java')!.includes('redhat/java')
    ).toBeTruthy();
    expect(
      vsCodeCurrentExtensionsLanguages.vscodeExtensionByLanguageId.get('java')!.includes('SonarSource/sonarlint-vscode')
    ).toBeTruthy();
    expect(
      vsCodeCurrentExtensionsLanguages.vscodeExtensionByLanguageId.get('python')!.includes('ms-python/python')
    ).toBeTruthy();
    expect(
      vsCodeCurrentExtensionsLanguages.vscodeExtensionByLanguageId
        .get('python')!
        .includes('SonarSource/sonarlint-vscode')
    ).toBeTruthy();

    // test plugins by file extensions
    expect(vsCodeCurrentExtensionsLanguages.languagesByFileExtensions).toBeDefined();
    expect(vsCodeCurrentExtensionsLanguages.languagesByFileExtensions.has('.class')).toBeTruthy();
    expect(vsCodeCurrentExtensionsLanguages.languagesByFileExtensions.has('.ipynb')).toBeTruthy();
    expect(vsCodeCurrentExtensionsLanguages.languagesByFileExtensions.get('.class')!.includes('java')).toBeTruthy();
    expect(vsCodeCurrentExtensionsLanguages.languagesByFileExtensions.get('.ipynb')!.includes('jupyter')).toBeTruthy();
  });
});
