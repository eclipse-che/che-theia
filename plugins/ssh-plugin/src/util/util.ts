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
import * as theia from '@theia/plugin';

import { appendFile, chmod, ensureFile, readFile, writeFile } from 'fs-extra';

import { resolve } from 'path';
import { spawn } from 'child_process';

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
  return resolve(os.homedir(), '.ssh', name.replace(new RegExp('\\.'), '_'));
}

export async function updateConfig(hostName: string): Promise<void> {
  const configFile = resolve(os.homedir(), '.ssh', 'config');
  await ensureFile(configFile);
  await chmod(configFile, '644');
  const keyConfig = `\nHost ${hostName.startsWith('default-') ? '*' : hostName}\nIdentityFile ${getKeyFilePath(
    hostName
  )}\nStrictHostKeyChecking = no\n`;
  const configContentBuffer = await readFile(configFile);
  if (configContentBuffer.indexOf(keyConfig) >= 0) {
    const newConfigContent = configContentBuffer.toString().replace(keyConfig, '');
    await writeFile(configFile, newConfigContent);
  } else {
    await appendFile(configFile, keyConfig);
  }
}

export async function writeKey(name: string, key: string): Promise<void> {
  const keyFile = getKeyFilePath(name);
  await appendFile(keyFile, key);
  await chmod(keyFile, '600');
}

export async function isEncrypted(keyPath: string): Promise<boolean> {
  return new Promise<boolean>(resolvePromise => {
    const command = spawn('sshpass', ['-p', '', '-P', 'assphrase', 'ssh-keygen', '-y', '-f', keyPath]);
    command.stdout.on('data', data => {
      resolvePromise(false);
    });
    command.stderr.on('data', data => {
      if (data.includes('incorrect passphrase supplied to decrypt private key')) {
        resolvePromise(true);
      }
    });
  });
}

export async function registerKey(keyPath: string, passphrase: string): Promise<void> {
  try {
    await sshAdd(keyPath, passphrase);
  } catch (e) {
    if (e.includes('Could not open a connection to your authentication agent')) {
      await startSshAgent();
      await sshAdd(keyPath, passphrase);
    }
  }
}

export function sshAdd(keyPath: string, passphrase: string): Promise<void> {
  return new Promise<void>((resolvePromise, reject) => {
    const command = spawn('sshpass', ['-p', passphrase, '-P', 'assphrase', 'ssh-add', keyPath]);
    command.stderr.on('data', async (data: string) => {
      reject(data);
    });
    command.on('close', () => {
      resolvePromise();
    });
  });
}

export function startSshAgent(): Promise<void> {
  return new Promise<void>((resolvePromise, reject) => {
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
      resolvePromise();
    });
  });
}
