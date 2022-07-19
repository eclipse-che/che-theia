/**********************************************************************
 * Copyright (c) 2021-2022 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

/* eslint-disable @typescript-eslint/no-explicit-any */

import 'reflect-metadata';

import * as fs from 'fs-extra';
import * as jsYaml from 'js-yaml';
import * as p from 'path';

import { CHE_PLUGINS_JSON, K8sPluginServiceImpl } from '../../src/node/k8s-plugin-service-impl';
import { ChePluginMetadata, PluginDependencies } from '@eclipse-che/theia-remote-api/lib/common/plugin-service';
import { Devfile, DevfileService } from '@eclipse-che/theia-remote-api/lib/common/devfile-service';

import { Container } from 'inversify';
import { HttpService } from '@eclipse-che/theia-remote-api/lib/common/http-service';
import { K8sDevWorkspaceEnvVariables } from '../../src/node/k8s-devworkspace-env-variables';
import { K8sDevfileServiceImpl } from '../../src/node/k8s-devfile-service-impl';
import { K8sWorkspaceServiceImpl } from '../../src/node/k8s-workspace-service-impl';
import { WorkspaceService } from '@eclipse-che/theia-remote-api/lib/common/workspace-service';

const EXTENSIONS_JSON_WITH_JAVA_EXTENSION: string = `{
  // See https://go.microsoft.com/fwlink/?LinkId=827846
  // for the documentation about the extensions.json format
  "recommendations": [
    "redhat.java"
  ]
}
`;

const PLUGINS_JSON_WITH_THREE_JAVA_PLUGINS = `{
  "plugins": [
    "redhat.java",
    "vscjava.vscode-java-debug",
    "vscjava.vscode-java-test"
  ]
}
`;

const EMPTY_PLUGINS_JSON = `{
  "plugins": []
}
`;

export const PLUGINS_JSON_WITH_MERMAID_MARKDOWN_SYNTAX_HIGHLIGHTING_PLUGIN = `{
  "plugins": [
    "goddard.mermaid-markdown-syntax-highlighting"
  ]
}
`;

// goddard/mermaid-markdown-syntax-highlighting/latest
export const MERMAID_MARKDOWN_SYNTAX_HIGHLIGHTING_CHE_THEIA_PLUGIN_YAML = `
schemaVersion: 1.0.0
metadata:
  id: goddard/mermaid-markdown-syntax-highlighting
  publisher: goddard
  name: mermaid-markdown-syntax-highlighting
  version: latest
  displayName: Mermaid Markdown Syntax Highlighting
  description: Markdown syntax support for the Mermaid charting language
  repository: 'https://github.com/bpruitt-goddard/vscode-mermaid-syntax-highlight.git'
  categories:
    - Other
  icon: /images/default.png
dependencies: []
extensions:
  - 'https://somehost/vscode-mermaid-syntax-highlight.vsix'
`;

// bierner/markdown-mermaid/latest
export const MARKDOWN_MERMAID_CHE_THEIA_PLUGIN_YAML = `
schemaVersion: 1.0.0
metadata:
  id: bierner/markdown-mermaid
  publisher: bierner
  name: markdown-mermaid
  version: latest
  displayName: Markdown Preview Mermaid Support
  description: Adds Mermaid diagram and flowchart support to VS Code's builtin markdown preview
  repository: 'https://github.com/mjbvz/vscode-markdown-mermaid.git'
  categories:
    - Other
  icon: /images/bierner-markdown-mermaid-icon.png
dependencies:
  - goddard/mermaid-markdown-syntax-highlighting
extensions:
  - 'https://somehost/vscode-markdown-mermaid-1.9.2.vsix'
`;

// ex/markdown-mermaid-templates/latest
export const MARKDOWN_MERMAID_TEMPLATES_CHE_THEIA_PLUGIN_YAML = `
schemaVersion: 1.0.0
metadata:
  id: ex/markdown-mermaid-templates
  publisher: ex
  name: markdown-mermaid-templates
  version: latest
  displayName: Templates for Markdown Preview Mermaid Support
  description: Provides Templates for Mermaid plugin
  repository: 'https://ex/vscode-markdown-templates.git'
  categories:
    - Other
  icon: /images/ex-markdown-mermaid-templates-icon.png
dependencies:
  - bierner/markdown-mermaid
  - goddard/mermaid-markdown-syntax-highlighting
extensions:
  - 'https://somehost/vscode-markdown-mermaid-templates-0.6.1.vsix'
`;

// redhat/java/latest
export const JAVA_CHE_THEIA_PLUGIN_YAML = `
schemaVersion: 1.0.0
metadata:
  id: redhat/java
  publisher: redhat
  name: java
  version: latest
  displayName: Language Support for Java(TM) by Red Hat
  description: Java Linting, Intellisense, formatting, refactoring, Maven/Gradle support and more...
  repository: https://github.com/redhat-developer/vscode-java
  categories:
    - Programming Languages
    - Linters
    - Formatters
    - Snippets
  icon: /images/redhat-java-icon.png
sidecar:
  name: vscode-java
  memoryLimit: 1500Mi
  memoryRequest: 20Mi
  cpuLimit: 800m
  cpuRequest: 30m
  volumeMounts:
    - name: m2
      path: /home/theia/.m2
  image: quay.io/eclipse/che-plugin-sidecar:java-23e57d6
preferences:
  java.server.launchMode: Standard
dependencies:
  - vscjava/vscode-java-debug
  - vscjava/vscode-java-test
extensions:
  - https://download.jboss.org/jbosstools/static/jdt.ls/stable/java-0.82.0-369.vsix
`;

// vscjava/vscode-java-test/latest
export const VSCODE_JAVA_TEST_CHE_THEIA_PLUGIN = `
schemaVersion: 1.0.0
metadata:
  id: vscjava/vscode-java-test
  publisher: vscjava
  name: vscode-java-test
  version: latest
  displayName: Java Test Runner
  description: Run and debug JUnit or TestNG test cases
  repository: https://github.com/Microsoft/vscode-java-test
  categories:
    - Other
  icon: /images/vscjava-vscode-java-test-icon.png
sidecar:
  name: vscode-java
  memoryLimit: 1500Mi
  memoryRequest: 20Mi
  cpuLimit: 800m
  cpuRequest: 30m
  image: quay.io/eclipse/che-plugin-sidecar:java-23e57d6
dependencies:
  - redhat/java
  - vscjava/vscode-java-debug
extensions:
  - https://open-vsx.org/api/vscjava/vscode-java-test/0.28.1/file/vscjava.vscode-java-test-0.28.1.vsix
`;

// vscjava/vscode-java-debug/latest
export const VSCODE_JAVA_DEBUG_CHE_THEIA_PLUGIN = `
schemaVersion: 1.0.0
metadata:
  id: vscjava/vscode-java-debug
  publisher: vscjava
  name: vscode-java-debug
  version: latest
  displayName: Debugger for Java
  description: A lightweight Java debugger for Visual Studio Code
  repository: https://github.com/Microsoft/vscode-java-debug.git
  categories:
    - Debuggers
    - Programming Languages
    - Other
  icon: /images/vscjava-vscode-java-debug-icon.png
sidecar:
  name: vscode-java
  memoryLimit: 1500Mi
  memoryRequest: 20Mi
  cpuLimit: 800m
  cpuRequest: 30m
  image: quay.io/eclipse/che-plugin-sidecar:java-23e57d6
dependencies: []
extensions:
  - https://download.jboss.org/jbosstools/vscode/3rdparty/vscode-java-debug/vscode-java-debug-0.26.0.vsix
`;

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// plugin registry index.json
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

const ATLASSIAN_ATLASCODE_CHE_THEIA_PLUGIN_YAML = `
schemaVersion: 1.0.0
metadata:
  id: atlassian/atlascode
  publisher: atlassian
  name: atlascode
  version: latest
  displayName: Jira and Bitbucket (Official)
  description: Bringing the power of Jira and Bitbucket to VS Code
  repository: https://bitbucket.org/atlassianlabs/atlascode.git
  categories:
    - Other
  icon: /images/atlassian-atlascode-icon.png
dependencies:
  - redhat/vscode-yaml
extensions:
  - https://open-vsx.org/api/atlassian/atlascode/2.8.6/file/atlassian.atlascode-2.8.6.vsix
`;

const BMEWBURN_VSCODE_INTELEPHENSE_CLIENT_CHE_THEIA_PLUGIN_YAML = `
schemaVersion: 1.0.0
metadata:
  id: bmewburn/vscode-intelephense-client
  publisher: bmewburn
  name: vscode-intelephense-client
  version: latest
  displayName: PHP Intelephense
  description: PHP code intelligence for Visual Studio Code
  repository: https://github.com/bmewburn/vscode-intelephense.git
  categories:
    - Programming Languages
    - Linters
    - Formatters
  icon: /images/bmewburn-vscode-intelephense-client-icon.png
sidecar:
  memoryLimit: 1Gi
  memoryRequest: 20Mi
  cpuLimit: 500m
  cpuRequest: 30m
  image: quay.io/eclipse/che-plugin-sidecar:php-c939ba4
dependencies: []
extensions:
  - https://github.com/redhat-developer/codeready-workspaces-vscode-extensions/releases/download/7.44-che-assets/vscode-intelephense-client-1.5.4.vsix
`;

const VSCODE_TYPESCRIPT_LANGUAGE_FEATURES_CHE_THEIA_PLUGIN_YAML = `
schemaVersion: 1.0.0
metadata:
  id: vscode/typescript-language-features
  publisher: vscode
  name: typescript-language-features
  version: latest
  displayName: TypeScript and JavaScript Language Features (built-in)
  description: Provides rich language support for JavaScript and TypeScript.
  repository: https://github.com/theia-ide/vscode-builtin-extensions
  categories:
    - Programming Languages
  icon: /images/vscode-typescript-language-features-icon.png
sidecar:
  memoryLimit: 512Mi
  memoryRequest: 20Mi
  cpuLimit: 500m
  cpuRequest: 30m
  image: quay.io/eclipse/che-plugin-sidecar:node-c939ba4
dependencies: []
extensions:
  - https://open-vsx.org/api/vscode/typescript-language-features/1.49.3/file/vscode.typescript-language-features-1.49.3.vsix
`;

const REDHAT_VSCODE_YAML_CHE_THEIA_PLUGIN_YAML = `
schemaVersion: 1.0.0
metadata:
  id: redhat/vscode-yaml
  publisher: redhat
  name: vscode-yaml
  version: latest
  displayName: YAML
  description: YAML Language Support by Red Hat, with built-in Kubernetes syntax support
  repository: https://github.com/redhat-developer/vscode-yaml
  categories:
    - Programming Languages
    - Linters
    - Snippets
    - Formatters
  icon: /images/redhat-vscode-yaml-icon.png
sidecar:
  name: vscode-yaml
  memoryLimit: 256Mi
  memoryRequest: 20Mi
  cpuLimit: 500m
  cpuRequest: 30m
  image: quay.io/eclipse/che-plugin-sidecar:node-c939ba4
dependencies: []
extensions:
  - https://open-vsx.org/api/redhat/vscode-yaml/0.14.0/file/redhat.vscode-yaml-0.14.0.vsix
`;

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

const DUMMY_DEVFILE: Devfile = {
  metadata: {},
  components: [
    {
      name: 'theia-ide',
      attributes: {
        'app.kubernetes.io/component': 'che-theia',
      },
    },
    {
      attributes: [],
      container: {
        mountSources: true,
        image: 'image',
      },
    },
  ],
};

class TestDevfileService extends K8sDevfileServiceImpl {}

class TestWorkspaceService extends K8sWorkspaceServiceImpl {}

describe('Test K8sPluginServiceImpl', () => {
  let container: Container;

  const mockGet = jest.fn();
  const mockHead = jest.fn();

  const httpServiceMock: HttpService = {
    get: mockGet,
    post: jest.fn(),
    head: mockHead,
  };

  let devfileService: TestDevfileService;
  let workspaceService: TestWorkspaceService;

  const ORIGINAL_ENV = { ...process.env };

  let devWorkspaceTemplateContent: string;
  let devWorkspaceTemplateWithInlinedExtensionsJsonContent: string;
  let devWorkspaceTemplateWithInlinedCheTheiaPluginsYamlContent: string;

  beforeAll(async () => {
    const devWorkspaceTemplatePath = p.resolve(__dirname, '..', '_data', 'devworkspace-template.json');
    devWorkspaceTemplateContent = await fs.readFile(devWorkspaceTemplatePath, 'utf-8');

    const devWorkspaceTemplateWithInlinedExtensionsJsonYaml = p.resolve(
      __dirname,
      '..',
      '_data',
      'devworkspace-template-with-inlined-extensions-json.yaml'
    );
    devWorkspaceTemplateWithInlinedExtensionsJsonContent = await fs.readFile(
      devWorkspaceTemplateWithInlinedExtensionsJsonYaml,
      'utf-8'
    );

    const devWorkspaceTemplateWithInlinedCheTheiaPluginsYaml = p.resolve(
      __dirname,
      '..',
      '_data',
      'devworkspace-template-with-inlined-che-theia-plugins.yaml'
    );
    devWorkspaceTemplateWithInlinedCheTheiaPluginsYamlContent = await fs.readFile(
      devWorkspaceTemplateWithInlinedCheTheiaPluginsYaml,
      'utf-8'
    );
  });

  beforeEach(async () => {
    jest.resetModules();

    process.env = { ...ORIGINAL_ENV };
    process.env.PROJECTS_ROOT = '/projects';

    // stubs
    process.env.CHE_DASHBOARD_URL = '.';
    process.env.DEVWORKSPACE_FLATTENED_DEVFILE = '.';
    process.env.DEVWORKSPACE_NAME = '.';
    process.env.DEVWORKSPACE_NAMESPACE = '.';
    process.env.DEVWORKSPACE_ID = '.';
    process.env.CHE_PLUGIN_REGISTRY_URL = '.';
    process.env.CHE_PLUGIN_REGISTRY_INTERNAL_URL = '.';

    jest.resetAllMocks();
    jest.resetModules();

    Object.assign(fs, {
      pathExists: async (path: string): Promise<boolean> => path === '/projects',
      readdir: async (path: string): Promise<string[]> => [],
      stat: async (path: string): Promise<fs.Stats> => Promise.reject(),
      readFile: async (path: string): Promise<string> => Promise.reject(),
      writeFile: async (path: string, data: string): Promise<void> => {},
    });

    container = new Container();
    container.bind(HttpService).toConstantValue(httpServiceMock);

    devfileService = new TestDevfileService();
    jest.spyOn(devfileService, 'get').mockImplementation(async () => DUMMY_DEVFILE);

    workspaceService = new TestWorkspaceService();

    container.bind(DevfileService).toConstantValue(devfileService);
    container.bind(K8sDevfileServiceImpl).toConstantValue(devfileService);

    container.bind(WorkspaceService).toConstantValue(workspaceService);
    container.bind(K8sWorkspaceServiceImpl).toConstantValue(workspaceService);

    container.bind(K8sDevWorkspaceEnvVariables).toSelf().inSingletonScope();
    container.bind(K8sPluginServiceImpl).toSelf().inSingletonScope();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  test('initialize :: should create /plugins/che-plugins.json with empty plugin list', async () => {
    let testContent = '';

    const writeFileMock = jest.fn();
    writeFileMock.mockImplementation(async (path: string, data: string): Promise<void> => {
      if (path === CHE_PLUGINS_JSON) {
        testContent = data;
        return;
      }

      return Promise.reject();
    });

    Object.assign(fs, {
      readdir: async (path: string): Promise<string[]> => {
        if (path === '/projects') {
          return ['project1'];
        }

        return Promise.reject();
      },

      writeFile: writeFileMock,
    });

    const pluginService = container.get(K8sPluginServiceImpl);
    await pluginService.deferred.promise;

    expect(writeFileMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(testContent)).toEqual(JSON.parse(EMPTY_PLUGINS_JSON));
  });

  /**
   * - extensions.json contains only redhat.java extension
   * - redhat/java/latest che plugin depends on vscjava/vscode-java-debug and vscjava/vscode-java-test
   * - after initializing, file /plugins/che-plugins.json should contain all there plugins
   */
  test('initialize :: should handle all the plugin dependencies', async () => {
    process.env.CHE_PLUGIN_REGISTRY_URL = 'http://public.uri/v3/';
    process.env.CHE_PLUGIN_REGISTRY_INTERNAL_URL = 'http://internal.uri/v3/';

    let testContent = '';

    Object.assign(fs, {
      pathExists: async (path: string): Promise<boolean> =>
        path === '/projects' || path === '/projects/project1/.vscode/extensions.json',

      readdir: async (path: string): Promise<string[]> => {
        if (path === '/projects') {
          return ['project1'];
        }

        return Promise.reject();
      },

      stat: async (path: string): Promise<fs.Stats> => {
        if (path === '/projects/project1/.vscode/extensions.json') {
          return {
            isFile: () => true,
          } as fs.Stats;
        }

        return Promise.reject();
      },

      readFile: async (path: string): Promise<string> => {
        if (path === '/projects/project1/.vscode/extensions.json') {
          return EXTENSIONS_JSON_WITH_JAVA_EXTENSION;
        }

        return Promise.reject();
      },

      writeFile: async (path: string, data: string): Promise<void> => {
        if (path === CHE_PLUGINS_JSON) {
          testContent = data;
          return;
        }

        return Promise.reject();
      },
    });

    mockGet.mockImplementation(async (url: string): Promise<string | undefined> => {
      switch (url) {
        case 'http://internal.uri/v3/plugins/redhat/java/latest/che-theia-plugin.yaml':
          return JAVA_CHE_THEIA_PLUGIN_YAML;

        case 'http://internal.uri/v3/plugins/vscjava/vscode-java-debug/latest/che-theia-plugin.yaml':
          return VSCODE_JAVA_DEBUG_CHE_THEIA_PLUGIN;

        case 'http://internal.uri/v3/plugins/vscjava/vscode-java-test/latest/che-theia-plugin.yaml':
          return VSCODE_JAVA_TEST_CHE_THEIA_PLUGIN;
      }

      return undefined;
    });

    mockHead.mockImplementation(
      async (url: string): Promise<boolean> =>
        url === 'https://download.jboss.org/jbosstools/static/jdt.ls/stable/java-0.82.0-369.vsix' ||
        url ===
          'https://download.jboss.org/jbosstools/vscode/3rdparty/vscode-java-debug/vscode-java-debug-0.26.0.vsix' ||
        url === 'https://open-vsx.org/api/vscjava/vscode-java-test/0.28.1/file/vscjava.vscode-java-test-0.28.1.vsix'
    );

    const pluginService = container.get(K8sPluginServiceImpl);
    await pluginService.deferred.promise;

    expect(JSON.parse(testContent)).toEqual(JSON.parse(PLUGINS_JSON_WITH_THREE_JAVA_PLUGINS));
  });

  test('initialize :: /plugins/che-plugins.json must not be overwritten if exists', async () => {
    const writeFileMock = jest.fn();

    Object.assign(fs, {
      pathExists: async (path: string): Promise<boolean> => {
        if (path === '/projects' || path === CHE_PLUGINS_JSON) {
          return true;
        }

        return false;
      },

      readFile: async (path: string): Promise<string> => {
        if (path === CHE_PLUGINS_JSON) {
          return EMPTY_PLUGINS_JSON;
        }

        return Promise.reject();
      },

      writeFile: writeFileMock,
    });

    const pluginService = container.get(K8sPluginServiceImpl);

    await pluginService.deferred.promise;

    expect(writeFileMock).toBeCalledTimes(0);
  });

  test('initialize :: should handle inlined .vscode/extensions.json', async () => {
    process.env.CHE_PLUGIN_REGISTRY_URL = 'http://public.uri/v3/';
    process.env.CHE_PLUGIN_REGISTRY_INTERNAL_URL = 'http://internal.uri/v3/';

    const devfile = jsYaml.safeLoad(devWorkspaceTemplateWithInlinedExtensionsJsonContent) as Devfile;
    const getDevfileMock = jest.spyOn(devfileService, 'get');
    getDevfileMock.mockImplementation(async () => devfile);

    let writtenPluginsJSONContent = '';

    const writeFileMock = jest.fn();
    writeFileMock.mockImplementation(async (path: string, data: string): Promise<void> => {
      if (path === CHE_PLUGINS_JSON) {
        writtenPluginsJSONContent = data;
        return;
      }

      return Promise.reject();
    });

    Object.assign(fs, {
      writeFile: writeFileMock,
    });

    mockGet.mockImplementation(async (url: string): Promise<string | undefined> => {
      switch (url) {
        case 'http://internal.uri/v3/plugins/vscode/typescript-language-features/latest/che-theia-plugin.yaml':
          return VSCODE_TYPESCRIPT_LANGUAGE_FEATURES_CHE_THEIA_PLUGIN_YAML;

        case 'http://internal.uri/v3/plugins/atlassian/atlascode/latest/che-theia-plugin.yaml':
          return ATLASSIAN_ATLASCODE_CHE_THEIA_PLUGIN_YAML;

        case 'http://internal.uri/v3/plugins/bmewburn/vscode-intelephense-client/latest/che-theia-plugin.yaml':
          return BMEWBURN_VSCODE_INTELEPHENSE_CLIENT_CHE_THEIA_PLUGIN_YAML;

        case 'http://internal.uri/v3/plugins/redhat/vscode-yaml/latest/che-theia-plugin.yaml':
          return REDHAT_VSCODE_YAML_CHE_THEIA_PLUGIN_YAML;
      }

      return undefined;
    });

    const pluginService = container.get(K8sPluginServiceImpl);
    await pluginService.deferred.promise;

    expect(writeFileMock).toHaveBeenCalledTimes(1);
    expect(getDevfileMock).toHaveBeenCalledTimes(1);

    expect(JSON.parse(writtenPluginsJSONContent)).toEqual({
      plugins: [
        'vscode.typescript-language-features',
        'bmewburn.vscode-intelephense-client',
        'atlassian.atlascode',
        'redhat.vscode-yaml',
      ],
    });

    expect(pluginService.installedPlugins).toEqual([
      'vscode/typescript-language-features/latest',
      'bmewburn/vscode-intelephense-client/latest',
      'atlassian/atlascode/latest',
      'redhat/vscode-yaml/latest',
    ]);
  });

  test('initialize :: should handle inlined .che/che-theia-plugins.yaml', async () => {
    process.env.CHE_PLUGIN_REGISTRY_URL = 'http://public.uri/v3/';
    process.env.CHE_PLUGIN_REGISTRY_INTERNAL_URL = 'http://internal.uri/v3/';

    const devfile = jsYaml.safeLoad(devWorkspaceTemplateWithInlinedCheTheiaPluginsYamlContent) as Devfile;
    const getDevfileMock = jest.spyOn(devfileService, 'get');
    getDevfileMock.mockImplementation(async () => devfile);

    let writtenPluginsJSONContent = '';

    const writeFileMock = jest.fn();
    writeFileMock.mockImplementation(async (path: string, data: string): Promise<void> => {
      if (path === CHE_PLUGINS_JSON) {
        writtenPluginsJSONContent = data;
        return;
      }

      return Promise.reject();
    });

    Object.assign(fs, {
      writeFile: writeFileMock,
    });

    mockGet.mockImplementation(async (url: string): Promise<string | undefined> => {
      switch (url) {
        case 'http://internal.uri/v3/plugins/vscode/typescript-language-features/latest/che-theia-plugin.yaml':
          return VSCODE_TYPESCRIPT_LANGUAGE_FEATURES_CHE_THEIA_PLUGIN_YAML;

        case 'http://internal.uri/v3/plugins/atlassian/atlascode/latest/che-theia-plugin.yaml':
          return ATLASSIAN_ATLASCODE_CHE_THEIA_PLUGIN_YAML;

        case 'http://internal.uri/v3/plugins/bmewburn/vscode-intelephense-client/latest/che-theia-plugin.yaml':
          return BMEWBURN_VSCODE_INTELEPHENSE_CLIENT_CHE_THEIA_PLUGIN_YAML;

        case 'http://internal.uri/v3/plugins/redhat/vscode-yaml/latest/che-theia-plugin.yaml':
          return REDHAT_VSCODE_YAML_CHE_THEIA_PLUGIN_YAML;
      }

      return undefined;
    });

    const pluginService = container.get(K8sPluginServiceImpl);
    await pluginService.deferred.promise;

    expect(writeFileMock).toHaveBeenCalledTimes(1);
    expect(getDevfileMock).toHaveBeenCalledTimes(1);

    expect(JSON.parse(writtenPluginsJSONContent)).toEqual({
      plugins: [
        'vscode.typescript-language-features',
        'atlassian.atlascode',
        'redhat.vscode-yaml',
        'bmewburn.vscode-intelephense-client',
      ],
    });

    expect(pluginService.installedPlugins).toEqual([
      'vscode/typescript-language-features/latest',
      'atlassian/atlascode/latest',
      'redhat/vscode-yaml/latest',
      'bmewburn/vscode-intelephense-client/latest',
    ]);
  });

  test('get default registry', async () => {
    process.env.CHE_PLUGIN_REGISTRY_URL = 'http://public.uri/v3/';
    process.env.CHE_PLUGIN_REGISTRY_INTERNAL_URL = 'http://internal.uri/v3/';

    const pluginService = container.get(K8sPluginServiceImpl);

    const defaultRegistry = await pluginService.getDefaultRegistry();

    expect(defaultRegistry.name).toBe('Eclipse Che plugins');
    expect(defaultRegistry.publicURI).toBe('http://public.uri/v3');
    expect(defaultRegistry.internalURI).toBe('http://internal.uri/v3');
  });

  test('get default registry :: failed on missing CHE_PLUGIN_REGISTRY_URL', async () => {
    process.env.CHE_PLUGIN_REGISTRY_URL = undefined;
    process.env.CHE_PLUGIN_REGISTRY_INTERNAL_URL = 'http://internal.uri/v3/';

    const pluginService = container.get(K8sPluginServiceImpl);

    try {
      await pluginService.getDefaultRegistry();
      fail();
    } catch (err) {
      expect(err.message).toBe('Plugin registry URL is not configured.');
    }
  });

  test('get default registry :: failed on missing CHE_PLUGIN_REGISTRY_INTERNAL_URL', async () => {
    process.env.CHE_PLUGIN_REGISTRY_URL = 'http://public.uri/v3/';
    process.env.CHE_PLUGIN_REGISTRY_INTERNAL_URL = undefined;

    const pluginService = container.get(K8sPluginServiceImpl);

    try {
      await pluginService.getDefaultRegistry();
      fail();
    } catch (err) {
      expect(err.message).toBe('Plugin registry internal URL is not configured.');
    }
  });

  test('get installed plugins :: should return three plugins', async () => {
    Object.assign(fs, {
      pathExists: async (path: string): Promise<boolean> => {
        if (path === '/projects' || path === CHE_PLUGINS_JSON) {
          return true;
        }

        return false;
      },

      readFile: async (path: string): Promise<string> => {
        if (path === CHE_PLUGINS_JSON) {
          return PLUGINS_JSON_WITH_THREE_JAVA_PLUGINS;
        }

        return Promise.reject();
      },
    });

    const pluginService = container.get(K8sPluginServiceImpl);
    await pluginService.deferred.promise;

    const plugins = await pluginService.getInstalledPlugins();
    expect(plugins).toEqual([
      'redhat/java/latest',
      'vscjava/vscode-java-debug/latest',
      'vscjava/vscode-java-test/latest',
    ]);
  });

  test('install plugin :: must skip if the plugin is already installed', async () => {
    Object.assign(fs, {
      pathExists: async (path: string): Promise<boolean> => {
        if (path === '/projects' || path === CHE_PLUGINS_JSON) {
          return true;
        }

        return false;
      },

      readFile: async (path: string): Promise<string> => {
        if (path === CHE_PLUGINS_JSON) {
          return PLUGINS_JSON_WITH_MERMAID_MARKDOWN_SYNTAX_HIGHLIGHTING_PLUGIN;
        }

        return Promise.reject();
      },
    });

    const pluginService = container.get(K8sPluginServiceImpl);
    await pluginService.deferred.promise;

    const prepareToInstallMock = jest.spyOn(pluginService, 'prepareToInstall');
    const fetchCheTheiaPluginYamlMock = jest.spyOn(pluginService, 'fetchCheTheiaPluginYaml');

    await pluginService.installPlugin('goddard/mermaid-markdown-syntax-highlighting/latest');

    expect(pluginService.installedPlugins).toEqual(['goddard/mermaid-markdown-syntax-highlighting/latest']);
    expect(pluginService.toInstall).toEqual([]);
    expect(pluginService.toRemove).toEqual([]);

    expect(prepareToInstallMock).toHaveBeenCalledTimes(1);
    expect(fetchCheTheiaPluginYamlMock).toHaveBeenCalledTimes(0);
  });

  test('install plugin :: must remove from toRemove list if the plugin has been marked for removal', async () => {
    Object.assign(fs, {
      pathExists: async (path: string): Promise<boolean> => {
        if (path === '/projects' || path === CHE_PLUGINS_JSON) {
          return true;
        }

        return false;
      },

      readFile: async (path: string): Promise<string> => {
        if (path === CHE_PLUGINS_JSON) {
          return PLUGINS_JSON_WITH_MERMAID_MARKDOWN_SYNTAX_HIGHLIGHTING_PLUGIN;
        }

        return Promise.reject();
      },
    });

    const pluginService = container.get(K8sPluginServiceImpl);
    await pluginService.deferred.promise;

    pluginService.toRemove.push('goddard/mermaid-markdown-syntax-highlighting/latest');

    await pluginService.installPlugin('goddard/mermaid-markdown-syntax-highlighting/latest');

    const prepareToInstallMock = jest.spyOn(pluginService, 'prepareToInstall');
    const fetchCheTheiaPluginYamlMock = jest.spyOn(pluginService, 'fetchCheTheiaPluginYaml');

    expect(pluginService.installedPlugins).toEqual(['goddard/mermaid-markdown-syntax-highlighting/latest']);
    expect(pluginService.toInstall).toEqual([]);
    expect(pluginService.toRemove).toEqual([]);

    expect(prepareToInstallMock).toHaveBeenCalledTimes(0);
    expect(fetchCheTheiaPluginYamlMock).toHaveBeenCalledTimes(0);
  });

  test('install plugin :: should add plugin toInstall list', async () => {
    process.env.CHE_PLUGIN_REGISTRY_URL = 'http://public.uri/v3/';
    process.env.CHE_PLUGIN_REGISTRY_INTERNAL_URL = 'http://internal.uri/v3/';

    Object.assign(fs, {
      pathExists: async (path: string): Promise<boolean> => {
        if (path === '/projects' || path === CHE_PLUGINS_JSON) {
          return true;
        }

        return false;
      },

      readFile: async (path: string): Promise<string> => {
        if (path === CHE_PLUGINS_JSON) {
          return EMPTY_PLUGINS_JSON;
        }

        return Promise.reject();
      },
    });

    const pluginService = container.get(K8sPluginServiceImpl);
    await pluginService.deferred.promise;

    mockGet.mockImplementation(async (url: string): Promise<string | undefined> => {
      if (
        url ===
        'http://internal.uri/v3/plugins/goddard/mermaid-markdown-syntax-highlighting/latest/che-theia-plugin.yaml'
      ) {
        return MERMAID_MARKDOWN_SYNTAX_HIGHLIGHTING_CHE_THEIA_PLUGIN_YAML;
      }

      return undefined;
    });

    mockHead.mockImplementation(async (url: string): Promise<boolean> => {
      if (url === 'https://somehost/vscode-mermaid-syntax-highlight.vsix') {
        return true;
      }

      return false;
    });

    const result = await pluginService.installPlugin('goddard/mermaid-markdown-syntax-highlighting/latest');
    expect(result).toBe(true);

    expect(pluginService.toInstall).toEqual(['goddard/mermaid-markdown-syntax-highlighting/latest']);
  });

  test('install plugin :: should handle plugin dependencies and add both plugins toInstall list', async () => {
    process.env.CHE_PLUGIN_REGISTRY_URL = 'http://public.uri/v3/';
    process.env.CHE_PLUGIN_REGISTRY_INTERNAL_URL = 'http://internal.uri/v3/';

    Object.assign(fs, {
      pathExists: async (path: string): Promise<boolean> => {
        if (path === '/projects' || path === CHE_PLUGINS_JSON) {
          return true;
        }

        return false;
      },

      readFile: async (path: string): Promise<string> => {
        if (path === CHE_PLUGINS_JSON) {
          return EMPTY_PLUGINS_JSON;
        }

        return Promise.reject();
      },
    });

    const pluginService = container.get(K8sPluginServiceImpl);
    await pluginService.deferred.promise;

    mockGet.mockImplementation(async (url: string): Promise<string | undefined> => {
      if (url === 'http://internal.uri/v3/plugins/bierner/markdown-mermaid/latest/che-theia-plugin.yaml') {
        return MARKDOWN_MERMAID_CHE_THEIA_PLUGIN_YAML;
      }

      if (
        url ===
        'http://internal.uri/v3/plugins/goddard/mermaid-markdown-syntax-highlighting/latest/che-theia-plugin.yaml'
      ) {
        return MERMAID_MARKDOWN_SYNTAX_HIGHLIGHTING_CHE_THEIA_PLUGIN_YAML;
      }

      return undefined;
    });

    mockHead.mockImplementation(async (url: string): Promise<boolean> => {
      if (
        url === 'https://somehost/vscode-markdown-mermaid-1.9.2.vsix' ||
        url === 'https://somehost/vscode-mermaid-syntax-highlight.vsix'
      ) {
        return true;
      }

      return false;
    });

    let askedDependencies;

    const askToInstallDependenciesMock = jest.fn();
    askToInstallDependenciesMock.mockImplementation(async (dependencies: PluginDependencies): Promise<boolean> => {
      askedDependencies = dependencies.plugins;
      return true;
    });

    pluginService.setClient({
      notifyPluginCacheSizeChanged: jest.fn(),
      notifyPluginCached: jest.fn(),
      notifyCachingComplete: jest.fn(),
      invalidRegistryFound: jest.fn(),
      invalidPluginFound: jest.fn(),
      askToInstallDependencies: askToInstallDependenciesMock,
    });

    const getPluginsMock = jest.spyOn(pluginService, 'getPlugins');
    getPluginsMock.mockImplementation(
      async (): Promise<ChePluginMetadata[]> => [
        {
          publisher: 'goddard',
          name: 'mermaid-markdown-syntax-highlighting',
          version: 'latest',
        } as ChePluginMetadata,
      ]
    );

    const result = await pluginService.installPlugin('bierner/markdown-mermaid/latest');
    expect(result).toBe(true);

    expect(askedDependencies).toEqual(['goddard/mermaid-markdown-syntax-highlighting/latest']);

    expect(pluginService.toInstall).toEqual([
      'bierner/markdown-mermaid/latest',
      'goddard/mermaid-markdown-syntax-highlighting/latest',
    ]);
  });

  test('install plugin :: should cancel the installation if the user rejected installing the dependencies', async () => {
    process.env.CHE_PLUGIN_REGISTRY_URL = 'http://public.uri/v3/';
    process.env.CHE_PLUGIN_REGISTRY_INTERNAL_URL = 'http://internal.uri/v3/';

    Object.assign(fs, {
      pathExists: async (path: string): Promise<boolean> => {
        if (path === '/projects' || path === CHE_PLUGINS_JSON) {
          return true;
        }

        return false;
      },

      readFile: async (path: string): Promise<string> => {
        if (path === CHE_PLUGINS_JSON) {
          return EMPTY_PLUGINS_JSON;
        }

        return Promise.reject();
      },
    });

    const pluginService = container.get(K8sPluginServiceImpl);
    await pluginService.deferred.promise;

    mockGet.mockImplementation(async (url: string): Promise<string | undefined> => {
      if (url === 'http://internal.uri/v3/plugins/bierner/markdown-mermaid/latest/che-theia-plugin.yaml') {
        return MARKDOWN_MERMAID_CHE_THEIA_PLUGIN_YAML;
      }

      if (
        url ===
        'http://internal.uri/v3/plugins/goddard/mermaid-markdown-syntax-highlighting/latest/che-theia-plugin.yaml'
      ) {
        return MERMAID_MARKDOWN_SYNTAX_HIGHLIGHTING_CHE_THEIA_PLUGIN_YAML;
      }

      return undefined;
    });

    mockHead.mockImplementation(
      async (url: string): Promise<boolean> =>
        url === 'https://somehost/vscode-markdown-mermaid-1.9.2.vsix' ||
        url === 'https://somehost/vscode-mermaid-syntax-highlight.vsix'
    );

    let askedDependencies;

    const askToInstallDependenciesMock = jest.fn();
    askToInstallDependenciesMock.mockImplementation(async (dependencies: PluginDependencies): Promise<boolean> => {
      askedDependencies = dependencies.plugins;
      return false;
    });

    pluginService.setClient({
      notifyPluginCacheSizeChanged: jest.fn(),
      notifyPluginCached: jest.fn(),
      notifyCachingComplete: jest.fn(),
      invalidRegistryFound: jest.fn(),
      invalidPluginFound: jest.fn(),
      askToInstallDependencies: askToInstallDependenciesMock,
    });

    const getPluginsMock = jest.spyOn(pluginService, 'getPlugins');
    getPluginsMock.mockImplementation(
      async (): Promise<ChePluginMetadata[]> => [
        {
          publisher: 'goddard',
          name: 'mermaid-markdown-syntax-highlighting',
          version: 'latest',
        } as ChePluginMetadata,
      ]
    );

    const result = await pluginService.installPlugin('bierner/markdown-mermaid/latest');
    expect(result).toBe(false);

    expect(askedDependencies).toEqual(['goddard/mermaid-markdown-syntax-highlighting/latest']);

    expect(pluginService.toInstall).toEqual([]);
  });

  test('install plugin :: should NOT ask the user if the required dependency is already installed', async () => {
    process.env.CHE_PLUGIN_REGISTRY_URL = 'http://public.uri/v3/';
    process.env.CHE_PLUGIN_REGISTRY_INTERNAL_URL = 'http://internal.uri/v3/';

    Object.assign(fs, {
      pathExists: async (path: string): Promise<boolean> => {
        if (path === '/projects' || path === CHE_PLUGINS_JSON) {
          return true;
        }

        return false;
      },

      readFile: async (path: string): Promise<string> => {
        if (path === CHE_PLUGINS_JSON) {
          return EMPTY_PLUGINS_JSON;
        }

        return Promise.reject();
      },
    });

    const pluginService = container.get(K8sPluginServiceImpl);
    await pluginService.deferred.promise;

    // add the required dependency to list of installed plugins
    pluginService.installedPlugins.push('goddard/mermaid-markdown-syntax-highlighting/latest');

    mockGet.mockImplementation(async (url: string): Promise<string | undefined> => {
      if (url === 'http://internal.uri/v3/plugins/bierner/markdown-mermaid/latest/che-theia-plugin.yaml') {
        return MARKDOWN_MERMAID_CHE_THEIA_PLUGIN_YAML;
      }

      return undefined;
    });

    mockHead.mockImplementation(
      async (url: string): Promise<boolean> =>
        url === 'https://somehost/vscode-markdown-mermaid-1.9.2.vsix' ||
        url === 'https://somehost/vscode-mermaid-syntax-highlight.vsix'
    );

    const askToInstallDependenciesMock = jest.fn();

    pluginService.setClient({
      notifyPluginCacheSizeChanged: jest.fn(),
      notifyPluginCached: jest.fn(),
      notifyCachingComplete: jest.fn(),
      invalidRegistryFound: jest.fn(),
      invalidPluginFound: jest.fn(),
      askToInstallDependencies: askToInstallDependenciesMock,
    });

    const getPluginsMock = jest.spyOn(pluginService, 'getPlugins');
    getPluginsMock.mockImplementation(
      async (): Promise<ChePluginMetadata[]> => [
        {
          publisher: 'goddard',
          name: 'mermaid-markdown-syntax-highlighting',
          version: 'latest',
        } as ChePluginMetadata,
        {
          publisher: 'bierner',
          name: 'markdown-mermaid',
          version: 'latest',
        } as ChePluginMetadata,
      ]
    );

    // install plugin
    const result = await pluginService.installPlugin('bierner/markdown-mermaid/latest');
    expect(result).toBe(true);

    expect(askToInstallDependenciesMock).toHaveBeenCalledTimes(0);

    expect(pluginService.toInstall).toEqual(['bierner/markdown-mermaid/latest']);

    // list of installed plugins should not be changed
    expect(pluginService.installedPlugins).toEqual(['goddard/mermaid-markdown-syntax-highlighting/latest']);
  });

  test('install plugin :: should handle chain of dependencies', async () => {
    process.env.CHE_PLUGIN_REGISTRY_URL = 'http://public.uri/v3/';
    process.env.CHE_PLUGIN_REGISTRY_INTERNAL_URL = 'http://internal.uri/v3/';

    Object.assign(fs, {
      pathExists: async (path: string): Promise<boolean> => {
        if (path === '/projects' || path === CHE_PLUGINS_JSON) {
          return true;
        }

        return false;
      },

      readFile: async (path: string): Promise<string> => {
        if (path === CHE_PLUGINS_JSON) {
          return EMPTY_PLUGINS_JSON;
        }

        return Promise.reject();
      },
    });

    const pluginService = container.get(K8sPluginServiceImpl);
    await pluginService.deferred.promise;

    mockGet.mockImplementation(async (url: string): Promise<string | undefined> => {
      switch (url) {
        case 'http://internal.uri/v3/plugins/ex/markdown-mermaid-templates/latest/che-theia-plugin.yaml':
          return MARKDOWN_MERMAID_TEMPLATES_CHE_THEIA_PLUGIN_YAML;

        case 'http://internal.uri/v3/plugins/bierner/markdown-mermaid/latest/che-theia-plugin.yaml':
          return MARKDOWN_MERMAID_CHE_THEIA_PLUGIN_YAML;

        case 'http://internal.uri/v3/plugins/goddard/mermaid-markdown-syntax-highlighting/latest/che-theia-plugin.yaml':
          return MERMAID_MARKDOWN_SYNTAX_HIGHLIGHTING_CHE_THEIA_PLUGIN_YAML;
      }

      return undefined;
    });

    mockHead.mockImplementation(
      async (url: string): Promise<boolean> =>
        url === 'https://somehost/vscode-markdown-mermaid-1.9.2.vsix' ||
        url === 'https://somehost/vscode-mermaid-syntax-highlight.vsix' ||
        url === 'https://somehost/vscode-markdown-mermaid-templates-0.6.1.vsix'
    );

    let askedDependencies;

    const askToInstallDependenciesMock = jest.fn();
    askToInstallDependenciesMock.mockImplementation(async (dependencies: PluginDependencies): Promise<boolean> => {
      askedDependencies = dependencies.plugins;
      return true;
    });

    pluginService.setClient({
      notifyPluginCacheSizeChanged: jest.fn(),
      notifyPluginCached: jest.fn(),
      notifyCachingComplete: jest.fn(),
      invalidRegistryFound: jest.fn(),
      invalidPluginFound: jest.fn(),
      askToInstallDependencies: askToInstallDependenciesMock,
    });

    const getPluginsMock = jest.spyOn(pluginService, 'getPlugins');
    getPluginsMock.mockImplementation(
      async (): Promise<ChePluginMetadata[]> => [
        {
          publisher: 'goddard',
          name: 'mermaid-markdown-syntax-highlighting',
          version: 'latest',
        } as ChePluginMetadata,
        {
          publisher: 'bierner',
          name: 'markdown-mermaid',
          version: 'latest',
        } as ChePluginMetadata,
      ]
    );

    // install plugin
    const result = await pluginService.installPlugin('ex/markdown-mermaid-templates/latest');
    expect(result).toBe(true);

    expect(askedDependencies).toEqual([
      'bierner/markdown-mermaid/latest',
      'goddard/mermaid-markdown-syntax-highlighting/latest',
    ]);

    expect(pluginService.toInstall).toEqual([
      'ex/markdown-mermaid-templates/latest',
      'bierner/markdown-mermaid/latest',
      'goddard/mermaid-markdown-syntax-highlighting/latest',
    ]);
  });

  test('install plugin :: should ask to install only ONE dependent plugin (another one is not listed in plugin registry index)', async () => {
    process.env.CHE_PLUGIN_REGISTRY_URL = 'http://public.uri/v3/';
    process.env.CHE_PLUGIN_REGISTRY_INTERNAL_URL = 'http://internal.uri/v3/';

    Object.assign(fs, {
      pathExists: async (path: string): Promise<boolean> => {
        if (path === '/projects' || path === CHE_PLUGINS_JSON) {
          return true;
        }

        return false;
      },

      readFile: async (path: string): Promise<string> => {
        if (path === CHE_PLUGINS_JSON) {
          return EMPTY_PLUGINS_JSON;
        }

        return Promise.reject();
      },
    });

    const pluginService = container.get(K8sPluginServiceImpl);
    await pluginService.deferred.promise;

    mockGet.mockImplementation(async (url: string): Promise<string | undefined> => {
      switch (url) {
        case 'http://internal.uri/v3/plugins/ex/markdown-mermaid-templates/latest/che-theia-plugin.yaml':
          return MARKDOWN_MERMAID_TEMPLATES_CHE_THEIA_PLUGIN_YAML;

        case 'http://internal.uri/v3/plugins/bierner/markdown-mermaid/latest/che-theia-plugin.yaml':
          return MARKDOWN_MERMAID_CHE_THEIA_PLUGIN_YAML;

        case 'http://internal.uri/v3/plugins/goddard/mermaid-markdown-syntax-highlighting/latest/che-theia-plugin.yaml':
          return MERMAID_MARKDOWN_SYNTAX_HIGHLIGHTING_CHE_THEIA_PLUGIN_YAML;
      }

      return undefined;
    });

    mockHead.mockImplementation(
      async (url: string): Promise<boolean> =>
        url === 'https://somehost/vscode-markdown-mermaid-1.9.2.vsix' ||
        url === 'https://somehost/vscode-mermaid-syntax-highlight.vsix' ||
        url === 'https://somehost/vscode-markdown-mermaid-templates-0.6.1.vsix'
    );

    let askedDependencies;

    const askToInstallDependenciesMock = jest.fn();
    askToInstallDependenciesMock.mockImplementation(async (dependencies: PluginDependencies): Promise<boolean> => {
      askedDependencies = dependencies.plugins;
      return true;
    });

    pluginService.setClient({
      notifyPluginCacheSizeChanged: jest.fn(),
      notifyPluginCached: jest.fn(),
      notifyCachingComplete: jest.fn(),
      invalidRegistryFound: jest.fn(),
      invalidPluginFound: jest.fn(),
      askToInstallDependencies: askToInstallDependenciesMock,
    });

    const getPluginsMock = jest.spyOn(pluginService, 'getPlugins');
    getPluginsMock.mockImplementation(
      async (): Promise<ChePluginMetadata[]> => [
        {
          publisher: 'bierner',
          name: 'markdown-mermaid',
          version: 'latest',
        } as ChePluginMetadata,
      ]
    );

    // install plugin
    const result = await pluginService.installPlugin('ex/markdown-mermaid-templates/latest');
    expect(result).toBe(true);

    expect(askedDependencies).toEqual(['bierner/markdown-mermaid/latest']);
    expect(askToInstallDependenciesMock).toHaveBeenCalledTimes(1);

    expect(pluginService.toInstall).toEqual([
      'ex/markdown-mermaid-templates/latest',
      'bierner/markdown-mermaid/latest',
      'goddard/mermaid-markdown-syntax-highlighting/latest',
    ]);
  });

  test('remove plugin :: must do nothing if the plugin is missing', async () => {
    Object.assign(fs, {
      pathExists: async (path: string): Promise<boolean> => {
        if (path === '/projects' || path === CHE_PLUGINS_JSON) {
          return true;
        }

        return false;
      },

      readFile: async (path: string): Promise<string> => {
        if (path === CHE_PLUGINS_JSON) {
          return EMPTY_PLUGINS_JSON;
        }

        return Promise.reject();
      },
    });

    const pluginService = container.get(K8sPluginServiceImpl);
    await pluginService.deferred.promise;

    await pluginService.removePlugin('goddard/mermaid-markdown-syntax-highlighting/latest');

    expect(pluginService.installedPlugins).toEqual([]);
    expect(pluginService.toInstall).toEqual([]);
    expect(pluginService.toRemove).toEqual([]);
  });

  test('remove plugin :: must do nothing if the plugin is already marked for removal', async () => {
    Object.assign(fs, {
      pathExists: async (path: string): Promise<boolean> => {
        if (path === '/projects' || path === CHE_PLUGINS_JSON) {
          return true;
        }

        return false;
      },

      readFile: async (path: string): Promise<string> => {
        if (path === CHE_PLUGINS_JSON) {
          return PLUGINS_JSON_WITH_MERMAID_MARKDOWN_SYNTAX_HIGHLIGHTING_PLUGIN;
        }

        return Promise.reject();
      },
    });

    const pluginService = container.get(K8sPluginServiceImpl);
    await pluginService.deferred.promise;

    pluginService.toRemove.push('goddard/mermaid-markdown-syntax-highlighting/latest');

    await pluginService.removePlugin('goddard/mermaid-markdown-syntax-highlighting/latest');

    expect(pluginService.installedPlugins).toEqual(['goddard/mermaid-markdown-syntax-highlighting/latest']);
    expect(pluginService.toInstall).toEqual([]);
    expect(pluginService.toRemove).toEqual(['goddard/mermaid-markdown-syntax-highlighting/latest']);
  });

  test('remove plugin :: must cancel the installation if the plugin is going to be intalled', async () => {
    Object.assign(fs, {
      pathExists: async (path: string): Promise<boolean> => {
        if (path === '/projects' || path === CHE_PLUGINS_JSON) {
          return true;
        }

        return false;
      },

      readFile: async (path: string): Promise<string> => {
        if (path === CHE_PLUGINS_JSON) {
          return EMPTY_PLUGINS_JSON;
        }

        return Promise.reject();
      },
    });

    const pluginService = container.get(K8sPluginServiceImpl);
    await pluginService.deferred.promise;

    pluginService.toInstall.push('goddard/mermaid-markdown-syntax-highlighting/latest');

    await pluginService.removePlugin('goddard/mermaid-markdown-syntax-highlighting/latest');

    expect(pluginService.installedPlugins).toEqual([]);
    expect(pluginService.toInstall).toEqual([]);
    expect(pluginService.toRemove).toEqual([]);
  });

  test('remove plugin :: must cancel the removal if there are several plugin dependencies', async () => {
    process.env.CHE_PLUGIN_REGISTRY_URL = 'http://public.uri/v3/';
    process.env.CHE_PLUGIN_REGISTRY_INTERNAL_URL = 'http://internal.uri/v3/';

    Object.assign(fs, {
      pathExists: async (path: string): Promise<boolean> => {
        if (path === '/projects' || path === CHE_PLUGINS_JSON) {
          return true;
        }

        return false;
      },

      readFile: async (path: string): Promise<string> => {
        if (path === CHE_PLUGINS_JSON) {
          return EMPTY_PLUGINS_JSON;
        }

        return Promise.reject();
      },
    });

    const pluginService = container.get(K8sPluginServiceImpl);
    await pluginService.deferred.promise;

    mockGet.mockImplementation(async (url: string): Promise<string | undefined> => {
      if (url === 'http://internal.uri/v3/plugins/bierner/markdown-mermaid/latest/che-theia-plugin.yaml') {
        return MARKDOWN_MERMAID_CHE_THEIA_PLUGIN_YAML;
      }

      if (url === 'http://internal.uri/v3/plugins/ex/markdown-mermaid-templates/latest/che-theia-plugin.yaml') {
        return MARKDOWN_MERMAID_TEMPLATES_CHE_THEIA_PLUGIN_YAML;
      }

      return undefined;
    });

    pluginService.installedPlugins.push('goddard/mermaid-markdown-syntax-highlighting/latest');
    pluginService.installedPlugins.push('bierner/markdown-mermaid/latest');

    pluginService.toInstall.push('ex/markdown-mermaid-templates/latest');

    const getPluginsMock = jest.spyOn(pluginService, 'getPlugins');
    getPluginsMock.mockImplementation(
      async (): Promise<ChePluginMetadata[]> => [
        {
          publisher: 'goddard',
          name: 'mermaid-markdown-syntax-highlighting',
          version: 'latest',
        } as ChePluginMetadata,
        {
          publisher: 'bierner',
          name: 'markdown-mermaid',
          version: 'latest',
        } as ChePluginMetadata,
        {
          publisher: 'ex',
          name: 'markdown-mermaid-templates',
          version: 'latest',
        } as ChePluginMetadata,
      ]
    );

    try {
      await pluginService.removePlugin('goddard/mermaid-markdown-syntax-highlighting/latest');
    } catch (error) {
      expect(error.message).toBe(
        "Cannot remove 'goddard/mermaid-markdown-syntax-highlighting/latest'. Plugins 'bierner/markdown-mermaid/latest', 'ex/markdown-mermaid-templates/latest' depend on this."
      );

      expect(pluginService.installedPlugins).toEqual([
        'goddard/mermaid-markdown-syntax-highlighting/latest',
        'bierner/markdown-mermaid/latest',
      ]);
      expect(pluginService.toInstall).toEqual(['ex/markdown-mermaid-templates/latest']);
      expect(pluginService.toRemove).toEqual([]);

      return;
    }

    fail();
  });

  test('remove plugin :: must reject the removal of the plugin if it is required for successful installation', async () => {
    process.env.CHE_PLUGIN_REGISTRY_URL = 'http://public.uri/v3/';
    process.env.CHE_PLUGIN_REGISTRY_INTERNAL_URL = 'http://internal.uri/v3/';

    Object.assign(fs, {
      pathExists: async (path: string): Promise<boolean> => {
        if (path === '/projects' || path === CHE_PLUGINS_JSON) {
          return true;
        }

        return false;
      },

      readFile: async (path: string): Promise<string> => {
        if (path === CHE_PLUGINS_JSON) {
          return EMPTY_PLUGINS_JSON;
        }

        return Promise.reject();
      },
    });

    const pluginService = container.get(K8sPluginServiceImpl);
    await pluginService.deferred.promise;

    mockGet.mockImplementation(async (url: string): Promise<string | undefined> => {
      if (url === 'http://internal.uri/v3/plugins/bierner/markdown-mermaid/latest/che-theia-plugin.yaml') {
        return MARKDOWN_MERMAID_CHE_THEIA_PLUGIN_YAML;
      }

      if (
        url ===
        'http://internal.uri/v3/plugins/goddard/mermaid-markdown-syntax-highlighting/latest/che-theia-plugin.yaml'
      ) {
        return MERMAID_MARKDOWN_SYNTAX_HIGHLIGHTING_CHE_THEIA_PLUGIN_YAML;
      }

      return undefined;
    });

    pluginService.toInstall.push('bierner/markdown-mermaid/latest');
    pluginService.toInstall.push('goddard/mermaid-markdown-syntax-highlighting/latest');

    const getPluginsMock = jest.spyOn(pluginService, 'getPlugins');
    getPluginsMock.mockImplementation(
      async (): Promise<ChePluginMetadata[]> => [
        {
          publisher: 'goddard',
          name: 'mermaid-markdown-syntax-highlighting',
          version: 'latest',
        } as ChePluginMetadata,
        {
          publisher: 'bierner',
          name: 'markdown-mermaid',
          version: 'latest',
        } as ChePluginMetadata,
      ]
    );

    try {
      await pluginService.removePlugin('goddard/mermaid-markdown-syntax-highlighting/latest');
    } catch (error) {
      expect(error.message).toBe(
        "Cannot remove 'goddard/mermaid-markdown-syntax-highlighting/latest'. Plugin 'bierner/markdown-mermaid/latest' depends on this."
      );

      expect(pluginService.toInstall).toEqual([
        'bierner/markdown-mermaid/latest',
        'goddard/mermaid-markdown-syntax-highlighting/latest',
      ]);

      expect(pluginService.installedPlugins).toEqual([]);
      expect(pluginService.toRemove).toEqual([]);

      return;
    }

    fail();
  });

  test('remove plugin :: must autoremove dependent plugin if it is not present in plugin registry index', async () => {
    process.env.CHE_PLUGIN_REGISTRY_URL = 'http://public.uri/v3/';
    process.env.CHE_PLUGIN_REGISTRY_INTERNAL_URL = 'http://internal.uri/v3/';

    Object.assign(fs, {
      pathExists: async (path: string): Promise<boolean> => {
        if (path === '/projects' || path === CHE_PLUGINS_JSON) {
          return true;
        }

        return false;
      },

      readFile: async (path: string): Promise<string> => {
        if (path === CHE_PLUGINS_JSON) {
          return PLUGINS_JSON_WITH_THREE_JAVA_PLUGINS;
        }

        return Promise.reject();
      },
    });

    const pluginService = container.get(K8sPluginServiceImpl);
    await pluginService.deferred.promise;

    mockGet.mockImplementation(async (url: string): Promise<string | undefined> => {
      if (url === 'http://internal.uri/v3/plugins/redhat/java/latest/che-theia-plugin.yaml') {
        return JAVA_CHE_THEIA_PLUGIN_YAML;
      }

      if (url === 'http://internal.uri/v3/plugins/vscjava/vscode-java-debug/latest/che-theia-plugin.yaml') {
        return VSCODE_JAVA_DEBUG_CHE_THEIA_PLUGIN;
      }

      if (url === 'http://internal.uri/v3/plugins/vscjava/vscode-java-test/latest/che-theia-plugin.yaml') {
        return VSCODE_JAVA_TEST_CHE_THEIA_PLUGIN;
      }

      return undefined;
    });

    const getPluginsMock = jest.spyOn(pluginService, 'getPlugins');
    getPluginsMock.mockImplementation(
      async (): Promise<ChePluginMetadata[]> => [
        {
          publisher: 'redhat',
          name: 'java',
          version: 'latest',
        } as ChePluginMetadata,
      ]
    );

    await pluginService.removePlugin('redhat/java/latest');
    expect(pluginService.toRemove).toEqual(['redhat/java/latest', 'vscjava/vscode-java-test/latest']);
  });

  test('persist :: do nothing if there is nothing to do', async () => {
    process.env.CHE_PLUGIN_REGISTRY_URL = 'http://public.uri/v3/';
    process.env.CHE_PLUGIN_REGISTRY_INTERNAL_URL = 'http://internal.uri/v3/';

    Object.assign(fs, {
      pathExists: async (path: string): Promise<boolean> => {
        if (path === '/projects' || path === CHE_PLUGINS_JSON) {
          return true;
        }

        return false;
      },

      readFile: async (path: string): Promise<string> => {
        if (path === CHE_PLUGINS_JSON) {
          return EMPTY_PLUGINS_JSON;
        }

        return Promise.reject();
      },
    });

    const pluginService = container.get(K8sPluginServiceImpl);
    await pluginService.deferred.promise;

    pluginService.installedPlugins.push('bierner/markdown-mermaid/latest');
    pluginService.installedPlugins.push('goddard/mermaid-markdown-syntax-highlighting/latest');

    const fetchCheTheiaPluginYamlMock = jest.spyOn(pluginService, 'fetchCheTheiaPluginYaml');

    await pluginService.persist();

    expect(pluginService.installedPlugins).toEqual([
      'bierner/markdown-mermaid/latest',
      'goddard/mermaid-markdown-syntax-highlighting/latest',
    ]);
    expect(pluginService.toInstall).toEqual([]);
    expect(pluginService.toRemove).toEqual([]);

    expect(fetchCheTheiaPluginYamlMock).toHaveBeenCalledTimes(0);
  });

  test('persist :: must download two extensions into /plugins directory without patching devworkspace object', async () => {
    process.env.CHE_PLUGIN_REGISTRY_URL = 'http://public.uri/v3/';
    process.env.CHE_PLUGIN_REGISTRY_INTERNAL_URL = 'http://internal.uri/v3/';

    Object.assign(fs, {
      pathExists: async (path: string): Promise<boolean> => {
        if (path === '/projects' || path === CHE_PLUGINS_JSON) {
          return true;
        }

        return false;
      },

      readFile: async (path: string): Promise<string> => {
        if (path === CHE_PLUGINS_JSON) {
          return EMPTY_PLUGINS_JSON;
        }

        return Promise.reject();
      },
    });

    const pluginService = container.get(K8sPluginServiceImpl);
    await pluginService.deferred.promise;

    pluginService.toInstall.push('bierner/markdown-mermaid/latest');
    pluginService.toInstall.push('goddard/mermaid-markdown-syntax-highlighting/latest');

    const askedPluginYamls: string[] = [];
    const askedExtensions: string[] = [];

    mockGet.mockImplementation(async (url: string): Promise<string | undefined> => {
      switch (url) {
        case 'http://internal.uri/v3/plugins/bierner/markdown-mermaid/latest/che-theia-plugin.yaml':
          askedPluginYamls.push('http://internal.uri/v3/plugins/bierner/markdown-mermaid/latest/che-theia-plugin.yaml');
          return MARKDOWN_MERMAID_CHE_THEIA_PLUGIN_YAML;

        case 'http://internal.uri/v3/plugins/goddard/mermaid-markdown-syntax-highlighting/latest/che-theia-plugin.yaml':
          askedPluginYamls.push(
            'http://internal.uri/v3/plugins/goddard/mermaid-markdown-syntax-highlighting/latest/che-theia-plugin.yaml'
          );
          return MERMAID_MARKDOWN_SYNTAX_HIGHLIGHTING_CHE_THEIA_PLUGIN_YAML;

        case 'https://somehost/vscode-markdown-mermaid-1.9.2.vsix':
          askedExtensions.push('https://somehost/vscode-markdown-mermaid-1.9.2.vsix');
          return 'content of vscode-markdown-mermaid-1.9.2.vsix';

        case 'https://somehost/vscode-mermaid-syntax-highlight.vsix':
          askedExtensions.push('https://somehost/vscode-mermaid-syntax-highlight.vsix');
          return 'content of vscode-mermaid-syntax-highlight.vsix';
      }

      return undefined;
    });

    let vscodeMarkdownMermaidContent;
    let vscodeMermaidSyntaxHighlightContent;

    let chePLuginsJsonContent = '';

    const writeFileMock = jest.fn();
    writeFileMock.mockImplementation(async (path: string, data: string): Promise<void> => {
      if (path === '/plugins/vscode-markdown-mermaid-1.9.2.vsix') {
        vscodeMarkdownMermaidContent = data;
        return;
      }

      if (path === '/plugins/vscode-mermaid-syntax-highlight.vsix') {
        vscodeMermaidSyntaxHighlightContent = data;
        return;
      }

      if (path === '/plugins/che-plugins.json') {
        chePLuginsJsonContent = data;
        return;
      }

      throw new Error(`Failure to write ${path}`);
    });

    Object.assign(fs, {
      writeFile: writeFileMock,
    });

    const fetchCheTheiaPluginYamlMock = jest.spyOn(pluginService, 'fetchCheTheiaPluginYaml');
    const downloadExtensionsMock = jest.spyOn(pluginService, 'downloadExtensions');

    const devWorkspaceTemplate: Devfile = JSON.parse(devWorkspaceTemplateContent) as Devfile;
    const getDevfileMock = jest.spyOn(devfileService, 'get');
    getDevfileMock.mockImplementation(async () => devWorkspaceTemplate);

    const patchDevfileMock = jest.spyOn(devfileService, 'patch');
    patchDevfileMock.mockImplementation(async (): Promise<void> => {});

    const stopWorkspaceMock = jest.spyOn(workspaceService, 'stop');
    stopWorkspaceMock.mockImplementation(async (): Promise<void> => {});

    await pluginService.persist();

    expect(fetchCheTheiaPluginYamlMock).toHaveBeenCalledTimes(2);
    expect(downloadExtensionsMock).toHaveBeenCalled();

    expect(patchDevfileMock).toHaveBeenCalledTimes(0);
    expect(stopWorkspaceMock).toHaveBeenCalledTimes(1);

    expect(writeFileMock).toHaveBeenCalledTimes(3);

    expect(askedPluginYamls).toEqual([
      'http://internal.uri/v3/plugins/bierner/markdown-mermaid/latest/che-theia-plugin.yaml',
      'http://internal.uri/v3/plugins/goddard/mermaid-markdown-syntax-highlighting/latest/che-theia-plugin.yaml',
    ]);

    expect(askedExtensions).toEqual([
      'https://somehost/vscode-markdown-mermaid-1.9.2.vsix',
      'https://somehost/vscode-mermaid-syntax-highlight.vsix',
    ]);

    expect(vscodeMarkdownMermaidContent).toBe('content of vscode-markdown-mermaid-1.9.2.vsix');
    expect(vscodeMermaidSyntaxHighlightContent).toBe('content of vscode-mermaid-syntax-highlight.vsix');

    expect(JSON.parse(chePLuginsJsonContent)).toEqual(
      JSON.parse(`
    {
      "plugins": [
        "bierner.markdown-mermaid",
        "goddard.mermaid-markdown-syntax-highlighting"
      ]
    }
    `)
    );
  });

  test('persist :: must download three extensions into /plugins/sidecars/tools directory and update devworkspace object', async () => {
    process.env.CHE_PLUGIN_REGISTRY_URL = 'http://public.uri/v3/';
    process.env.CHE_PLUGIN_REGISTRY_INTERNAL_URL = 'http://internal.uri/v3/';

    Object.assign(fs, {
      pathExists: async (path: string): Promise<boolean> => {
        if (path === '/projects' || path === CHE_PLUGINS_JSON) {
          return true;
        }

        return false;
      },

      readFile: async (path: string): Promise<string> => {
        if (path === CHE_PLUGINS_JSON) {
          return EMPTY_PLUGINS_JSON;
        }

        return Promise.reject();
      },
    });

    const pluginService = container.get(K8sPluginServiceImpl);
    await pluginService.deferred.promise;

    pluginService.toInstall.push('redhat/java/latest');
    pluginService.toInstall.push('vscjava/vscode-java-debug/latest');
    pluginService.toInstall.push('vscjava/vscode-java-test/latest');

    const askedPluginYamls: string[] = [];
    const askedExtensions: string[] = [];

    mockGet.mockImplementation(async (url: string): Promise<string | undefined> => {
      switch (url) {
        case 'http://internal.uri/v3/plugins/redhat/java/latest/che-theia-plugin.yaml':
          askedPluginYamls.push('http://internal.uri/v3/plugins/redhat/java/latest/che-theia-plugin.yaml');
          return JAVA_CHE_THEIA_PLUGIN_YAML;

        case 'http://internal.uri/v3/plugins/vscjava/vscode-java-debug/latest/che-theia-plugin.yaml':
          askedPluginYamls.push(
            'http://internal.uri/v3/plugins/vscjava/vscode-java-debug/latest/che-theia-plugin.yaml'
          );
          return VSCODE_JAVA_DEBUG_CHE_THEIA_PLUGIN;

        case 'http://internal.uri/v3/plugins/vscjava/vscode-java-test/latest/che-theia-plugin.yaml':
          askedPluginYamls.push('http://internal.uri/v3/plugins/vscjava/vscode-java-test/latest/che-theia-plugin.yaml');
          return VSCODE_JAVA_TEST_CHE_THEIA_PLUGIN;

        case 'https://download.jboss.org/jbosstools/static/jdt.ls/stable/java-0.82.0-369.vsix':
          askedExtensions.push('https://download.jboss.org/jbosstools/static/jdt.ls/stable/java-0.82.0-369.vsix');
          return 'content of java-0.82.0-369.vsix';

        case 'https://download.jboss.org/jbosstools/vscode/3rdparty/vscode-java-debug/vscode-java-debug-0.26.0.vsix':
          askedExtensions.push(
            'https://download.jboss.org/jbosstools/vscode/3rdparty/vscode-java-debug/vscode-java-debug-0.26.0.vsix'
          );
          return 'content of vscode-java-debug-0.26.0.vsix';

        case 'https://open-vsx.org/api/vscjava/vscode-java-test/0.28.1/file/vscjava.vscode-java-test-0.28.1.vsix':
          askedExtensions.push(
            'https://open-vsx.org/api/vscjava/vscode-java-test/0.28.1/file/vscjava.vscode-java-test-0.28.1.vsix'
          );
          return 'content of vscjava.vscode-java-test-0.28.1.vsix';
      }

      return undefined;
    });

    const devWorkspaceTemplate: Devfile = JSON.parse(devWorkspaceTemplateContent) as Devfile;
    const getDevfileMock = jest.spyOn(devfileService, 'get');
    getDevfileMock.mockImplementation(async () => devWorkspaceTemplate);

    let patchPath;
    let patchValue;

    const patchDevfileMock = jest.spyOn(devfileService, 'patch');
    patchDevfileMock.mockImplementation(async (path, value): Promise<void> => {
      patchPath = path;
      patchValue = value;
    });

    let javaExtensionContent;
    let javaTestExtensionContent;
    let javaDebugExtensionContent;

    let chePLuginsJsonContent = '';

    Object.assign(fs, {
      ensureDir: async (path: string) => {},
      writeFile: async (path: string, data: string): Promise<void> => {
        if (path === '/plugins/sidecars/tools/java-0.82.0-369.vsix') {
          javaExtensionContent = data;
          return;
        }

        if (path === '/plugins/sidecars/tools/vscjava.vscode-java-test-0.28.1.vsix') {
          javaTestExtensionContent = data;
          return;
        }

        if (path === '/plugins/sidecars/tools/vscode-java-debug-0.26.0.vsix') {
          javaDebugExtensionContent = data;
          return;
        }

        if (path === '/plugins/che-plugins.json') {
          chePLuginsJsonContent = data;
          return;
        }

        throw new Error(`Failure to write ${path}`);
      },
    });

    const stopWorkspaceMock = jest.spyOn(workspaceService, 'stop');
    stopWorkspaceMock.mockImplementation(async (): Promise<void> => {});

    await pluginService.persist();

    expect(askedPluginYamls).toEqual([
      'http://internal.uri/v3/plugins/redhat/java/latest/che-theia-plugin.yaml',
      'http://internal.uri/v3/plugins/vscjava/vscode-java-debug/latest/che-theia-plugin.yaml',
      'http://internal.uri/v3/plugins/vscjava/vscode-java-test/latest/che-theia-plugin.yaml',
    ]);

    expect(askedExtensions).toEqual([
      'https://download.jboss.org/jbosstools/static/jdt.ls/stable/java-0.82.0-369.vsix',
      'https://download.jboss.org/jbosstools/vscode/3rdparty/vscode-java-debug/vscode-java-debug-0.26.0.vsix',
      'https://open-vsx.org/api/vscjava/vscode-java-test/0.28.1/file/vscjava.vscode-java-test-0.28.1.vsix',
    ]);

    expect(patchDevfileMock).toHaveBeenCalled();
    expect(stopWorkspaceMock).toHaveBeenCalled();

    expect(patchPath).toBe('/spec/template/components');

    const toolsContainer = pluginService.findDevContainer({
      components: patchValue,
    } as Devfile);

    expect(toolsContainer).toBeDefined();

    expect(toolsContainer.name).toBe('tools');

    expect(toolsContainer.attributes).toBeDefined();

    const extensionsAttribute = toolsContainer.attributes!['che-theia.eclipse.org/vscode-extensions'];
    expect(extensionsAttribute).toBeDefined();

    const preferencesAttribute = toolsContainer.attributes!['che-theia.eclipse.org/vscode-preferences'];
    expect(preferencesAttribute).toBeDefined();

    expect(extensionsAttribute).toEqual([
      'https://download.jboss.org/jbosstools/static/jdt.ls/stable/java-0.82.0-369.vsix',
      'https://download.jboss.org/jbosstools/vscode/3rdparty/vscode-java-debug/vscode-java-debug-0.26.0.vsix',
      'https://open-vsx.org/api/vscjava/vscode-java-test/0.28.1/file/vscjava.vscode-java-test-0.28.1.vsix',
    ]);

    expect(preferencesAttribute).toEqual({
      'java.server.launchMode': 'Standard',
    });

    expect(javaExtensionContent).toBe('content of java-0.82.0-369.vsix');
    expect(javaTestExtensionContent).toBe('content of vscjava.vscode-java-test-0.28.1.vsix');
    expect(javaDebugExtensionContent).toBe('content of vscode-java-debug-0.26.0.vsix');

    expect(JSON.parse(chePLuginsJsonContent)).toEqual(
      JSON.parse(`
    {
      "plugins": [
        "redhat.java",
        "vscjava.vscode-java-debug",
        "vscjava.vscode-java-test"
      ]
    }
    `)
    );
  });
});
