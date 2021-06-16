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

import { Devfile, DevfileService } from '@eclipse-che/theia-remote-api/lib/common/devfile-service';

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
});
