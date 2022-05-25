/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
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
import * as ini from 'ini';
import * as path from 'path';

import {
  GIT_USER_CONFIG_PATH,
  GitConfigurationController,
  UserConfiguration,
} from '../src/node/git-configuration-controller';

import { CheGitClient } from '../lib/common/git-protocol';
import { CheTheiaUserPreferencesSynchronizer } from '@eclipse-che/theia-user-preferences-synchronizer/lib/node/che-theia-preferences-synchronizer';
import { Container } from 'inversify';

describe('Test GitConfigurationController', () => {
  let container: Container;
  let gitConfigurationController: GitConfigurationController;
  const cheTheiaUserPreferencesSynchronizerGetpreferencesMock = jest.fn();
  const cheTheiaUserPreferencesSynchronizerSetpreferencesMock = jest.fn();
  const cheTheiaUserPreferencesSynchronizerOnTheiaUserPreferencesCreatedMock = jest.fn();
  const cheTheiaUserPreferencesSynchronizer = {
    getPreferences: cheTheiaUserPreferencesSynchronizerGetpreferencesMock,
    setPreferences: cheTheiaUserPreferencesSynchronizerSetpreferencesMock,
    onTheiaUserPreferencesCreated: cheTheiaUserPreferencesSynchronizerOnTheiaUserPreferencesCreatedMock,
  } as any;
  cheTheiaUserPreferencesSynchronizerGetpreferencesMock.mockResolvedValue({});
  const cheGitClient: CheGitClient = {
    firePreferencesChanged: jest.fn(),
  };

  beforeEach(async () => {
    jest.restoreAllMocks();
    // jest.resetAllMocks();
    jest.spyOn(fs, 'readdirSync').mockReturnValue([]);
    jest.spyOn(fs, 'pathExistsSync').mockReturnValue(false);
    container = new Container();
    container.bind(CheTheiaUserPreferencesSynchronizer).toConstantValue(cheTheiaUserPreferencesSynchronizer);
    container.bind(GitConfigurationController).toSelf().inSingletonScope();
    gitConfigurationController = container.get(GitConfigurationController);
    gitConfigurationController.setClient(cheGitClient);
  });

  test('check Update', async () => {
    const gitLfsConfigPath = path.resolve(__dirname, '_data', 'git-lfs.config');
    const gitLfsConfig = await fs.readFile(gitLfsConfigPath, 'utf-8');
    const readFileSpy = jest.spyOn(fs, 'readFileSync') as jest.Mock;
    readFileSpy.mockReturnValue(gitLfsConfig);
    const pathExistsSpy = jest.spyOn(fs, 'pathExistsSync') as jest.Mock;
    pathExistsSpy.mockReturnValue(true);
    const writeFileSpy = jest.spyOn(fs, 'writeFileSync') as jest.Mock;
    // do not write anything
    writeFileSpy.mockResolvedValue({});

    const userConfig: UserConfiguration = {
      name: 'dummy',
      email: 'my@fake.email',
    };

    await gitConfigurationController.updateUserGitonfigFromUserConfig(userConfig);
    expect(gitConfigurationController).toBeDefined();

    // it should contain lfs data
    expect(writeFileSpy).toBeCalledWith(GIT_USER_CONFIG_PATH, expect.stringContaining('lfs'));
    // plug name and email
    expect(writeFileSpy).toBeCalledWith(GIT_USER_CONFIG_PATH, expect.stringContaining('dummy'));
    expect(writeFileSpy).toBeCalledWith(GIT_USER_CONFIG_PATH, expect.stringContaining('my@fake.email'));
  });

  test('check getUserConfigurationFromGitConfig', async () => {
    const gitLfsConfigPath = path.resolve(__dirname, '_data', 'git-lfs.config');
    const gitLfsConfig = await fs.readFile(gitLfsConfigPath, 'utf-8');

    const userConfigPath = path.resolve(__dirname, '_data', 'git-user.config');
    const userConfig = await fs.readFile(userConfigPath, 'utf-8');
    const readFileSpy = jest.spyOn(fs, 'readFileSync') as jest.Mock;
    const pathExistsSpy = jest.spyOn(fs, 'pathExistsSync') as jest.Mock;

    // GIT_USER_CONFIG_PATH
    readFileSpy.mockReturnValueOnce(gitLfsConfig);
    pathExistsSpy.mockReturnValueOnce(true);

    // GIT_GLOBAL_CONFIG_PATH
    readFileSpy.mockReturnValueOnce(userConfig);
    pathExistsSpy.mockReturnValueOnce(true);

    const userConfiguration = await gitConfigurationController.getUserConfigurationFromGitConfig();

    expect(userConfiguration).toStrictEqual({
      name: 'dummy',
      email: 'my@fake.email',
    });
  });

  test('check updateLocalGitconfig', async () => {
    const gitConfigurationControllerProto = Object.getPrototypeOf(gitConfigurationController);
    const userGitconfigContent = fs.readFileSync(path.resolve(__dirname, '_data', 'git-user.config')).toString();
    const lfsGitconfigContent = fs.readFileSync(path.resolve(__dirname, '_data', 'git-lfs.config')).toString();
    gitConfigurationControllerProto.userGitconfigDirty = ini.parse(userGitconfigContent);
    const dir = {
      isFile: () => false,
      isDirectory: () => true,
      isBlockDevice: () => true,
      isCharacterDevice: () => true,
      isSymbolicLink: () => true,
      isFIFO: () => true,
      isSocket: () => true,
      name: 'dirName',
    };
    jest.spyOn(fs, 'readdirSync').mockReturnValueOnce([dir]);
    const gitUserConfigPath = path.resolve(__dirname, '_data', 'git-user.config');
    jest.spyOn(path, 'resolve').mockReturnValueOnce(gitUserConfigPath);
    const writeFileSpy = jest.spyOn(fs, 'writeFileSync') as jest.Mock;
    // do not write anything
    writeFileSpy.mockReturnValue({});

    gitConfigurationControllerProto.updateLocalGitconfig(ini.parse(userGitconfigContent.concat(lfsGitconfigContent)));

    expect(writeFileSpy).toBeCalledWith(gitUserConfigPath, expect.stringContaining('lfs'));
    expect(writeFileSpy).toBeCalledWith(gitUserConfigPath, expect.stringContaining('dummy'));
    expect(writeFileSpy).toBeCalledWith(gitUserConfigPath, expect.stringContaining('my@fake.email'));
  });
});
