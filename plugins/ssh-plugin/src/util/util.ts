/**********************************************************************
 * Copyright (c) 2019-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as os from 'os';
import * as path from 'path';
import * as theia from '@theia/plugin';

import { appendFile, chmod, ensureFile, readFile, writeFile } from 'fs-extra';

import { spawn } from 'child_process';

export const output = theia.window.createOutputChannel('ssh-plugin');

export async function getHostName(message?: string): Promise<string | undefined> {
  const hostNamePattern = new RegExp('^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$');

  return theia.window.showInputBox({
    placeHolder: message ? message : 'Please provide a hostname e.g. github.com',
    validateInput: (text: string) => {
      if (!hostNamePattern.test(text)) {
        return 'Invalid hostname';
      }
    },
  });
}

export function getKeyFilePath(name: string): string {
  return path.resolve(os.homedir(), '.ssh', name.replace(new RegExp('\\.'), '_'));
}

export async function updateConfig(hostName: string): Promise<void> {
  const configFile = path.resolve(os.homedir(), '.ssh', 'config');
  await ensureFile(configFile);
  await chmod(configFile, '644');

  const configHost = hostName.startsWith('default-') ? '*' : hostName;
  const configIdentityFile = getKeyFilePath(hostName);

  const keyConfig = `\nHost ${configHost}\nIdentityFile ${configIdentityFile}\nStrictHostKeyChecking = no\n`;

  const configContentBuffer = await readFile(configFile);
  if (configContentBuffer.indexOf(keyConfig) >= 0) {
    // it's confusing!
    // Do we need to remove the config at all??????
    const newConfigContent = configContentBuffer.toString().replace(keyConfig, '');
    await writeFile(configFile, newConfigContent);
  } else {
    await appendFile(configFile, keyConfig);
  }
}

/**
 * Creates a keyfile in ~/.ssh/ directory.
 * Returns path to the keyfile.
 */
export async function writeKey(name: string, key: string): Promise<string> {
  const keyFile = getKeyFilePath(name);
  await appendFile(keyFile, key);
  await chmod(keyFile, '600');
  return keyFile;
}

export async function sleep(timeout: number): Promise<void> {
  return new Promise<void>(resolve => setTimeout(resolve, timeout));
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

const MISSING_AUTHENTICATION_AGENT = 'Could not open a connection to your authentication agent';
const IDENTITY_ADDED = 'Identity added';

export async function registerKey(keyPath: string, passphrase: string): Promise<void> {
  try {
    await sshAdd(keyPath, passphrase);
    return;
  } catch (reason) {
    if (reason && reason.startsWith(MISSING_AUTHENTICATION_AGENT)) {
      await startSshAgent();
    } else {
      return Promise.reject(reason);
    }
  }

  await sshAdd(keyPath, passphrase);
}

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

      reject(`Unable to register ${keyPath}`);
      resolved = true;
    });
  });
}

export function startSshAgent(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const command = spawn('ssh-agent', ['-s']);
    command.stderr.on('data', async (data: string) => {
      reject(data);
    });

    command.stdout.on('data', async data => {
      const dataString = data.toString();
      const env = dataString.substring(0, dataString.indexOf('='));
      const value = dataString.substring(dataString.indexOf('=') + 1, dataString.indexOf(';'));
      process.env[env] = value;
    });

    command.on('close', () => {
      resolve();
    });
  });
}
