/**********************************************************************
 * Copyright (c) 2019-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import './fake-frontend-config';

import {
  Devfile,
  DevfileComponentStatus,
  DevfileService,
} from '@eclipse-che/theia-remote-api/lib/common/devfile-service';

import { Container } from 'inversify';
import { PreferenceServiceImpl } from '@theia/core/lib/browser';
import { PreferencesProvider } from '../src/browser/prefs-provider';
import { WorkspaceService } from '@theia/workspace/lib/browser';

const mockSetProperty: any = jest.fn();
const mockHasProperty: any = jest.fn();
let container: Container;
const devfileServiceGetMethod = jest.fn();
const devfileServiceGetComponentStatusesMethod = jest.fn();
const devfileService = {
  get: devfileServiceGetMethod,
  getComponentStatuses: devfileServiceGetComponentStatusesMethod,
};
let prefsProvider: PreferencesProvider;
const consoleErrorMock = jest.fn();
const originalConsoleLogError = console.error;
beforeEach(() => {
  jest.restoreAllMocks();
  jest.resetAllMocks();
  container = new Container();
  console.error = consoleErrorMock;

  const preferenceServiceImpl = {
    has: mockHasProperty,
    set: mockSetProperty,
  } as PreferenceServiceImpl;
  const workspaceService = {
    roots: jest.fn().mockResolvedValue({}),
    workspace: jest.fn().mockReturnValue({ uri: 'workspace-uri' }),
  } as unknown as WorkspaceService;

  container.bind(PreferencesProvider).toSelf().inSingletonScope();
  container.bind(WorkspaceService).toConstantValue(workspaceService);
  container.bind(PreferenceServiceImpl).toConstantValue(preferenceServiceImpl);
  container.bind(DevfileService).toConstantValue(devfileService);
  prefsProvider = container.get(PreferencesProvider);
});

afterEach(() => {
  console.error = originalConsoleLogError;
});

const prefsExpectation: [string, any][] = [
  ['java.jdt.ls.vmargs', '-noverify -Xmx1G -XX:+UseG1GC -XX:+UseStringDeduplication'],
  ['java.home', '/home/user/jdk11'],
];
const allPrefsExpectation = prefsExpectation.concat([['asciidoc.use_asciidoctorpdf', true]]);

describe('PreferenceProvider', () => {
  test('should not overwrite an existing property', async () => {
    const skipedProperty = prefsExpectation[0][0];
    const expectedProperty = prefsExpectation[1][0];
    mockHasProperty.mockImplementation((propName: string) => {
      // let one of two properties is already exist in workspace scope
      if (propName === skipedProperty) {
        return true;
      }
    });

    await (<any>prefsProvider).setPluginProperties(prefsExpectation);

    expect(mockSetProperty.mock.calls.length).toEqual(1);
    expect(mockSetProperty.mock.calls[0][0]).toEqual(expectedProperty);
  });

  test('should retrieve preferences', async () => {
    const devfileV2: Devfile = {
      apiVersion: '2.0.0',
      metadata: {},
      projects: [],
      components: [
        {
          name: '',
          plugin: {
            id: 'eclipse/che-machine-exec-plugin/0.0.1',
            endpoints: [],
            volumeMounts: [],
            env: [],
          },
        },
        {
          plugin: {
            id: 'redhat/java/0.63.0',
            endpoints: [],
            volumeMounts: [],
            env: [],
            preferences: {
              'java.jdt.ls.vmargs': '-noverify -Xmx1G -XX:+UseG1GC -XX:+UseStringDeduplication',
              'java.home': '/home/user/jdk11',
            },
          },
        },
        {
          name: 'asciidoctor-vscodef07',
          container: {
            image: 'fooimage',
            env: [
              {
                name: 'CHE_THEIA_SIDECAR_PREFERENCES',
                value: '{"asciidoc.use_asciidoctorpdf":true}',
              },
            ],
          },
        },
      ],
    };
    devfileServiceGetMethod.mockReturnValue(devfileV2);
    const componentStatuses = [
      {
        name: 'asciidoctor-vscodef07',
        isUser: false,
        endpoints: {},
        env: [
          {
            name: 'CHE_THEIA_SIDECAR_PREFERENCES',
            value: '{"asciidoc.use_asciidoctorpdf":true}',
          },
        ],
      },
    ];
    devfileServiceGetComponentStatusesMethod.mockReturnValue(componentStatuses);
    const setPluginSpy = jest.spyOn(prefsProvider, 'setPluginProperties');
    setPluginSpy.mockResolvedValue();

    await prefsProvider.restorePluginProperties();

    expect((<any>prefsProvider).setPluginProperties.mock.calls[0][0]).toEqual(allPrefsExpectation);
  });

  test('should handle invalid env preferences', async () => {
    devfileServiceGetComponentStatusesMethod.mockReturnValue([]);
    const devfileV2: Devfile = {
      apiVersion: '2.0.0',
      metadata: {},
      projects: [],
      components: [
        {
          name: 'asciidoctor-1',
          container: {
            image: 'fooimage',
            env: [
              {
                name: 'CHE_THEIA_SIDECAR_PREFERENCES',
                value: 'NOT A VALID JSON',
              },
            ],
          },
        },
      ],
    };
    const componentStatuses = [
      {
        name: 'asciidoctor-1',
        isUser: false,
        endpoints: {},
        env: [
          {
            name: 'CHE_THEIA_SIDECAR_PREFERENCES',
            value: 'NOT A VALID JSON',
          },
        ],
      },
      {
        name: 'asciidoctor-2',
        isUser: false,
        endpoints: {},
        env: [
          {
            name: 'CHE_THEIA_SIDECAR_PREFERENCES',
            value: '{"foo": "bar"}',
          },
        ],
      },
    ];
    devfileServiceGetComponentStatusesMethod.mockReturnValue(componentStatuses);
    devfileServiceGetMethod.mockReturnValue(devfileV2);

    const setPluginSpy = jest.spyOn(prefsProvider, 'setPluginProperties');
    setPluginSpy.mockResolvedValue();

    await prefsProvider.restorePluginProperties();

    expect((<any>prefsProvider).setPluginProperties.mock.calls[0][0]).toEqual([['foo', 'bar']]);
    expect(consoleErrorMock.mock.calls[0][0]).toMatch(
      new RegExp('Ignoring invalid JSON value .* for ENV=CHE_THEIA_SIDECAR_PREFERENCES')
    );
  });

  test('should retrieve preferences from v2 devworkspaces', async () => {
    const devfileV2: Devfile = {
      commands: [
        {
          apply: {
            component: 'remote-runtime-injector',
          },
          attributes: {
            'controller.devfile.io/imported-by': 'theia-ide-workspacecaeeb4cfdcd44c82',
          },
          id: 'init-container-command',
        },
        {
          exec: {
            commandLine: 'mvn clean install',
            component: 'tools',
            group: {
              isDefault: true,
              kind: 'build',
            },
            workingDir: '${PROJECTS_ROOT}/java-spring-petclinic',
          },
          id: 'build',
        },
        {
          exec: {
            commandLine: 'java -jar target/*.jar',
            component: 'tools',
            group: {
              isDefault: true,
              kind: 'run',
            },
            workingDir: '${PROJECTS_ROOT}/java-spring-petclinic',
          },
          id: 'run',
        },
        {
          exec: {
            commandLine: 'java -jar -Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005 target/*.jar',
            component: 'tools',
            group: {
              isDefault: true,
              kind: 'run',
            },
            workingDir: '${PROJECTS_ROOT}/java-spring-petclinic',
          },
          id: 'run-debug',
        },
        {
          apply: {
            component: 'project-clone',
          },
          id: 'clone-projects',
        },
      ],
      components: [
        {
          attributes: {
            'app.kubernetes.io/component': 'che-theia',
            'app.kubernetes.io/part-of': 'che-theia.eclipse.org',
            'controller.devfile.io/imported-by': 'theia-ide-workspacecaeeb4cfdcd44c82',
          },
          container: {
            image: 'quay.io/eclipse/che-theia:next',
            memoryLimit: '512M',
            mountSources: true,
            sourceMapping: '/projects',
          },
          name: 'theia-ide',
        },
        {
          attributes: {
            'controller.devfile.io/imported-by': 'theia-ide-workspacecaeeb4cfdcd44c82',
          },
          name: 'plugins',
          volume: {},
        },
        {
          attributes: {
            'controller.devfile.io/imported-by': 'theia-ide-workspacecaeeb4cfdcd44c82',
          },
          name: 'theia-local',
          volume: {},
        },
        {
          attributes: {
            'app.kubernetes.io/component': 'machine-exec',
            'app.kubernetes.io/part-of': 'che-theia.eclipse.org',
            'controller.devfile.io/imported-by': 'theia-ide-workspacecaeeb4cfdcd44c82',
          },
          container: {
            command: ['/go/bin/che-machine-exec', '--url', '127.0.0.1:3333'],
            cpuLimit: '500m',
            cpuRequest: '30m',
            env: [
              {
                name: 'CHE_DASHBOARD_URL',
                value: 'https://che-eclipse-che.apps.cluster-4dbd.4dbd.sandbox199.opentlc.com',
              },
              {
                name: 'CHE_PLUGIN_REGISTRY_URL',
                value: 'https://che-eclipse-che.apps.cluster-4dbd.4dbd.sandbox199.opentlc.com/plugin-registry/v3',
              },
              {
                name: 'CHE_PLUGIN_REGISTRY_INTERNAL_URL',
                value: 'http://plugin-registry.eclipse-che.svc:8080/v3',
              },
            ],
            image: 'quay.io/eclipse/che-machine-exec:next',
            memoryLimit: '128Mi',
            memoryRequest: '32Mi',
            sourceMapping: '/projects',
          },
          name: 'che-machine-exec',
        },
        {
          attributes: {
            'app.kubernetes.io/component': 'remote-runtime-injector',
            'app.kubernetes.io/part-of': 'che-theia.eclipse.org',
            'controller.devfile.io/imported-by': 'theia-ide-workspacecaeeb4cfdcd44c82',
          },
          container: {
            image: 'quay.io/eclipse/che-theia-endpoint-runtime-binary:next',
            sourceMapping: '/projects',
          },
          name: 'remote-runtime-injector',
        },
        {
          attributes: {
            'controller.devfile.io/imported-by': 'theia-ide-workspacecaeeb4cfdcd44c82',
          },
          name: 'remote-endpoint',
        },
        {
          attributes: {
            'app.kubernetes.io/name': 'tools',
            'che-theia.eclipse.org/vscode-extensions': [
              'https://download.jboss.org/jbosstools/static/jdt.ls/stable/java-0.75.0-60.vsix',
              'https://download.jboss.org/jbosstools/vscode/3rdparty/vscode-java-debug/vscode-java-debug-0.26.0.vsix',
              'https://open-vsx.org/api/vscjava/vscode-java-test/0.28.1/file/vscjava.vscode-java-test-0.28.1.vsix',
            ],
            'che-theia.eclipse.org/vscode-preferences': {
              'java.server.launchMode': 'Standard',
            },
          },
          container: {
            args: ['sh', '-c', '${PLUGIN_REMOTE_ENDPOINT_EXECUTABLE}'],
            image: 'quay.io/eclipse/che-java11-maven:next',
            memoryLimit: '3Gi',
            sourceMapping: '/projects',
          },
          name: 'tools',
        },
        {
          name: 'm2',
          volume: {
            size: '1G',
          },
        },
        {
          container: {
            cpuLimit: '1000m',
            cpuRequest: '100m',
            image: 'quay.io/devfile/project-clone:v0.9.0',
            memoryLimit: '1Gi',
            memoryRequest: '128Mi',
            mountSources: true,
          },
          name: 'project-clone',
        },
      ],
      projects: [
        {
          git: {
            checkoutFrom: {
              revision: 'devfilev2',
            },
            remotes: {
              origin: 'https://github.com/che-samples/java-spring-petclinic.git',
            },
          },
          name: 'java-spring-petclinic',
        },
      ],
      apiVersion: '',
      metadata: {
        name: 'foo',
      },
    };

    devfileServiceGetMethod.mockReturnValue(devfileV2);
    const componentStatuses: DevfileComponentStatus[] = [];
    devfileServiceGetComponentStatusesMethod.mockReturnValue(componentStatuses);
    const setPluginSpy = jest.spyOn(prefsProvider, 'setPluginProperties');
    setPluginSpy.mockResolvedValue();

    await prefsProvider.restorePluginProperties();

    const javaPreferences: [string, any][] = [['java.server.launchMode', 'Standard']];
    expect((<any>prefsProvider).setPluginProperties.mock.calls[0][0]).toEqual(javaPreferences);
  });
});
