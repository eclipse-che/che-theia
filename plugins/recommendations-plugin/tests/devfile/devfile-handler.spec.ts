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

import * as che from '@eclipse-che/plugin';

import { Container } from 'inversify';
import { DevfileHandler } from '../../src/devfile/devfile-handler';
import { che as cheApi } from '@eclipse-che/api';

describe('Test DevfileHandler', () => {
  let container: Container;

  const getCurrentWorkspace = jest.fn();

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    che.workspace.getCurrentWorkspace = getCurrentWorkspace;
    container = new Container();
    container.bind(DevfileHandler).toSelf().inSingletonScope();
  });

  describe('hasPlugins', () => {
    test('hasPlugins true', async () => {
      const redhatJavaPlugin: cheApi.workspace.devfile.Component = {
        id: 'redhat/java/latest',
        type: 'chePlugin',
      };
      const anotherJavaPlugin: cheApi.workspace.devfile.Component = {
        id: 'invalid',
        type: 'chePlugin',
      };

      const editor: cheApi.workspace.devfile.Component = {
        id: 'my-editor',
        type: 'cheEditor',
      };

      const devfile: cheApi.workspace.devfile.Devfile = {
        components: [editor, anotherJavaPlugin, redhatJavaPlugin],
      };

      const workspace: cheApi.workspace.Workspace = {
        devfile,
      };
      getCurrentWorkspace.mockReturnValue(workspace);

      const devfileHandler = container.get(DevfileHandler);
      const hasPlugins = await devfileHandler.hasPlugins();
      expect(hasPlugins).toBeTruthy();
    });

    test('hasPlugins false', async () => {
      const devfile: cheApi.workspace.devfile.Devfile = {};

      const workspace: cheApi.workspace.Workspace = {
        devfile,
      };
      getCurrentWorkspace.mockReturnValue(workspace);

      const devfileHandler = container.get(DevfileHandler);
      const hasPlugins = await devfileHandler.hasPlugins();
      expect(hasPlugins).toBeFalsy();
    });
  });

  describe('addPlugins', () => {
    test('able to add plug-ins', async () => {
      const devfile: cheApi.workspace.devfile.Devfile = {};

      const id = '1234';
      const workspace: cheApi.workspace.Workspace = {
        id,
        devfile,
      };
      getCurrentWorkspace.mockReturnValue(workspace);

      const devfileHandler = container.get(DevfileHandler);
      const plugins = ['redhat/java'];
      // before, no components
      expect(devfile.components).toBeUndefined();

      const updateMethod = jest.fn();
      che.workspace.update = updateMethod;

      const updateMock = updateMethod.mock;
      await devfileHandler.addPlugins(plugins);

      // after, some components
      expect(updateMethod).toBeCalled();
      expect(updateMock.calls[0][0]).toBe(id);
      const workspaceProvided = updateMock.calls[0][1];
      expect(workspaceProvided.devfile.components).toBeDefined();
      expect(workspaceProvided.devfile.components.length).toBe(1);
      expect(workspaceProvided.devfile.components[0].id).toBe('redhat/java/latest');
      expect(workspaceProvided.devfile.components[0].type).toBe('chePlugin');
    });
  });

  describe('isRecommendedExtensionsDisabled', () => {
    test('devfile with empty attributes has not disabled recommendations', async () => {
      const devfile = {};
      const id = '1234';
      const workspace = {
        id,
        devfile,
      };
      getCurrentWorkspace.mockReturnValue(workspace);

      const devfileHandler = container.get(DevfileHandler);
      const isDisabled = await devfileHandler.isRecommendedExtensionsDisabled();

      // after, some components
      expect(isDisabled).toBeFalsy();
    });

    test('devfile has disabled recommendations', async () => {
      const devfile = {
        attributes: {} as any,
      };
      devfile.attributes[DevfileHandler.DISABLED_RECOMMENDATIONS_PROPERTY] = 'true';

      const id = '1234';
      const workspace = {
        id,
        devfile,
      };
      getCurrentWorkspace.mockReturnValue(workspace);

      const devfileHandler = container.get(DevfileHandler);
      const isDisabled = await devfileHandler.isRecommendedExtensionsDisabled();

      // after, some components
      expect(isDisabled).toBeTruthy();
    });
  });

  describe('isRecommendedExtensionsOpenFileEnabled', () => {
    test('devfile with empty attributes has not open files recommendations', async () => {
      const devfile = {};
      const id = '1234';
      const workspace = {
        id,
        devfile,
      };
      getCurrentWorkspace.mockReturnValue(workspace);

      const devfileHandler = container.get(DevfileHandler);
      const isEnabled = await devfileHandler.isRecommendedExtensionsOpenFileEnabled();

      expect(isEnabled).toBeFalsy();
    });

    test('devfile has enabled recommendations', async () => {
      const devfile = {
        attributes: {} as any,
      };
      devfile.attributes[DevfileHandler.OPENFILES_RECOMMENDATIONS_PROPERTY] = 'true';

      const id = '1234';
      const workspace = {
        id,
        devfile,
      };
      getCurrentWorkspace.mockReturnValue(workspace);

      const devfileHandler = container.get(DevfileHandler);
      const isEnabled = await devfileHandler.isRecommendedExtensionsOpenFileEnabled();

      expect(isEnabled).toBeTruthy();
    });
  });

  describe('disableRecommendations', () => {
    test('devfile with no attributes is updated', async () => {
      const devfile: any = {};
      const id = '1234';
      const workspace = {
        id,
        devfile,
      };
      getCurrentWorkspace.mockReturnValue(workspace);

      const devfileHandler = container.get(DevfileHandler);
      const updateMethod = jest.fn();
      const updateMock = updateMethod.mock;
      che.workspace.update = updateMethod;
      await devfileHandler.disableRecommendations();

      // after, some components
      expect(updateMethod).toBeCalled();
      expect(updateMock.calls[0][0]).toBe(id);
      const workspaceProvided = updateMock.calls[0][1];
      expect(workspaceProvided.devfile.attributes).toBeDefined();
      expect(workspaceProvided.devfile.attributes[DevfileHandler.DISABLED_RECOMMENDATIONS_PROPERTY]).toBeDefined();
      expect(workspaceProvided.devfile.attributes[DevfileHandler.DISABLED_RECOMMENDATIONS_PROPERTY]).toBe('true');
    });
  });
});
