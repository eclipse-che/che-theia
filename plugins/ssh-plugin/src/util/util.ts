/**********************************************************************
 * Copyright (c) 2019-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import * as theia from '@theia/plugin';

import { spawn } from 'child_process';

export const output = theia.window.createOutputChannel('ssh-plugin');

export async function askHostName(message?: string): Promise<string | undefined> {
  const hostNamePattern = new RegExp('^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$');

  return theia.window.showInputBox({
    placeHolder: message ? message : 'Please provide a hostname e.g. github.com',
    validateInput: (text: string) => {
      if (!hostNamePattern.test(text)) {
        return Promise.resolve('Invalid hostname');
      }
    },
  });
}

/**
 * Retuns path of existent key or undefined if key is not found.
 */
export async function findKey(keyName: string | undefined): Promise<string | undefined> {
  if (keyName) {
    const fileName = keyName.replace(new RegExp('\\.'), '_');

    const homeKey = path.resolve(os.homedir(), '.ssh', fileName);
    if (await fs.pathExists(homeKey)) {
      return homeKey;
    }

    const systemKey = `/etc/ssh/private/${fileName}`;
    if (await fs.pathExists(systemKey)) {
      return systemKey;
    }
  }

  return undefined;
}

export function getKeyFilePath(name: string): string {
  return path.resolve(os.homedir(), '.ssh', name.replace(new RegExp('\\.'), '_'));
}

export async function updateConfig(hostName: string): Promise<void> {
  const configFile = path.resolve(os.homedir(), '.ssh', 'config');
  await fs.ensureFile(configFile);
  await fs.chmod(configFile, '644');

  const configHost = hostName.startsWith('default-') ? '*' : hostName;
  const configIdentityFile = getKeyFilePath(hostName);

  const keyConfig = `\nHost ${configHost}\nIdentityFile ${configIdentityFile}\nStrictHostKeyChecking = no\n`;

  const configContentBuffer = await fs.readFile(configFile);
  if (configContentBuffer.indexOf(keyConfig) >= 0) {
    // Remove config from the file
    const newConfigContent = configContentBuffer.toString().replace(keyConfig, '');
    await fs.writeFile(configFile, newConfigContent);
  } else {
    await fs.appendFile(configFile, keyConfig);
  }
}

/**
 * Creates a keyfile in ~/.ssh/ directory.
 * Returns path to the keyfile.
 */
export async function writeKey(name: string, key: string): Promise<string> {
  // ensure ~/.ssh directory exists
  const sshDir = path.resolve(os.homedir(), '.ssh');
  await fs.ensureDir(sshDir);

  // get keyfile path
  const keyFile = getKeyFilePath(name);

  // write file
  await fs.writeFile(keyFile, key);

  // change permissions
  await fs.chmod(keyFile, '600');
  return keyFile;
}

export async function isEncrypted(keyPath: string): Promise<boolean> {
  return new Promise<boolean>(async (resolve, reject) => {
    const command = spawn('sshpass', ['-p', '', '-P', 'assphrase', 'ssh-keygen', '-y', '-f', keyPath]);
    command.stdout.on('data', data => {
      resolve(false);
    });

    command.stderr.on('data', (d: string) => {
      const data: string = d.toString();
      if (data.includes('incorrect passphrase supplied to decrypt private key')) {
        resolve(true);
        return;
      }

      reject(data);
    });
  });
}

const IDENTITY_ADDED = 'Identity added';

export async function sshAdd(keyPath: string, passphrase: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const command = spawn('sshpass', ['-p', passphrase, '-P', 'passphrase', 'ssh-add', keyPath]);

    let resolved = false;
    command.stderr.on('data', async (d: string) => {
      if (resolved) {
        return;
      }

      const data = d.toString();
      if (data.startsWith(IDENTITY_ADDED)) {
        resolve();
      } else {
        reject(data);
      }

      resolved = true;
    });

    command.on('close', () => {
      if (resolved) {
        return;
      }

      reject(`Unable to register SSH key ${keyPath}`);
      resolved = true;
    });
  });
}

export async function registerKeyAskingPassword(
  keyFile: string,
  prompt: boolean,
  actions?: string[]
): Promise<boolean> {
  if (await isEncrypted(keyFile)) {
    const passphrase = await theia.window.showInputBox({
      placeHolder: 'Enter passphrase for key',
      password: true,
      ignoreFocusOut: true,
      prompt: prompt ? `SSH: ${keyFile}` : undefined,
    });

    if (passphrase) {
      await sshAdd(keyFile, passphrase);
    } else {
      await theia.window.showErrorMessage('Passphrase for key was not entered', ...(actions ? actions : []));
      return false;
    }
  } else {
    await sshAdd(keyFile, '');
  }

  return true;
}
