/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as che from '@eclipse-che/plugin';
import * as os from 'os';
import * as theia from '@theia/plugin';

import {
  SSH_ADD_TO_GITHUB,
  SSH_CREATE,
  SSH_DELETE,
  SSH_GENERATE,
  SSH_GENERATE_FOR_HOST,
  SSH_UPLOAD,
  SSH_VIEW,
} from './commands';
import {
  access,
  appendFile,
  chmod,
  ensureFile,
  mkdtemp,
  pathExists,
  readFile,
  remove,
  unlink,
  writeFile,
} from 'fs-extra';
import { join, resolve } from 'path';

import { R_OK } from 'constants';
import { che as cheApi } from '@eclipse-che/api';
import { spawn } from 'child_process';

export interface PluginModel {
  configureSSH(gitHubActions: boolean): Promise<boolean>;
}

const MESSAGE_NEED_RESTART_WORKSPACE =
  'Che Git plugin can leverage the generated keys now. To make them available in all workspace containers please restart your workspace.';

const MESSAGE_ENTER_KEY_NAME_OR_LEAVE_EMPTY =
  'Please provide a hostname (e.g. github.com) or leave empty to setup default name';

const MESSAGE_NO_SSH_KEYS = 'There are no SSH keys.';

const MESSAGE_GET_KEYS_FAILED = 'Failure to fetch SSH keys.';

const CONTINUE = 'Continue';

const PUBLIC_KEY_SCHEME = 'publickey';

export async function start(): Promise<PluginModel> {
  let keys: cheApi.ssh.SshPair[];
  try {
    keys = await che.ssh.getAll('vcs');
  } catch (e) {
    console.error(e.message);
    keys = [];
  }

  const keyPath = (keyName: string | undefined) => (keyName ? '/etc/ssh/private/' + keyName : '');
  const passphrase = (privateKey: string | undefined) =>
    privateKey ? privateKey.substring(privateKey.indexOf('\npassphrase: ') + 13, privateKey.length - 1) : '';
  keys
    .filter(key => isEncrypted(keyPath(key.name)))
    .forEach(key => registerKey(keyPath(key.name), passphrase(key.privateKey)));

  let gitLogHandlerInitialized: boolean;
  /* Git log handler, listens to Git events, catches the clone and push events.
    Asks to Upload a public SSH key if needed before these operations.
    Authenticates to Github if needed. */
  const onChange = () => {
    // Get the vscode Git plugin if the plugin is started.
    const gitExtension = theia.plugins.getPlugin('vscode.git');
    if (!gitLogHandlerInitialized && gitExtension && gitExtension.exports) {
      // Set the initialized flag to true state, to not to initialize the handler again on plugin change event.
      gitLogHandlerInitialized = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const git: any = gitExtension.exports._model.git;
      let command: string;
      let url: string;
      let path: string;
      const listener = async (out: string) => {
        // Parse Git log events.
        const split = out.split(' ');
        if (out.startsWith('> git clone') || out.startsWith('> git push')) {
          command = split[2];
          url = split[3];
          path = split[4];
          // Catch the remote access error.
        } else if (out.indexOf('Permission denied (publickey).') > -1) {
          // If the remote repository is a GitHub repository, ask to upload a public SSH key.
          if ((await che.oAuth.isRegistered('github')) && out.indexOf('git@github.com') > -1) {
            switch (command) {
              case 'clone': {
                if (await generateAndUploadKeyToGithub(true)) {
                  await git.clone(url, path.substring(0, path.lastIndexOf('/')));
                  theia.window.showInformationMessage(`Project ${url} successfully cloned to ${path}`);
                }
                break;
              }
              case 'push': {
                if (await generateAndUploadKeyToGithub(false)) {
                  theia.window.showInformationMessage(
                    'The public SSH key has been uploaded to Github, please try to push again.'
                  );
                }
                break;
              }
            }
            // If the remote repository is not a GitHub repository, show a proposal to manually add a public SSH key to related Git provider.
          } else {
            showWarningMessage(keys.length === 0);
          }
        }
      };
      // Set the git log listener.
      git.onOutput.addListener('log', listener);
    }
  };

  const showWarningMessage = (showGenerate: boolean, gitProviderName?: string) =>
    theia.window.showWarningMessage(`Permission denied, please ${
      showGenerate ? 'generate (F1 => ' + SSH_GENERATE.label + ') and ' : ''
    }
        upload your public SSH key to ${
          gitProviderName ? gitProviderName : 'the Git provider'
        } and try again. To get the public key press F1 => ${SSH_VIEW.label}`);

  theia.plugins.onDidChange(onChange);

  theia.commands.registerCommand(SSH_GENERATE_FOR_HOST, () => {
    generateKeyPairForHost();
  });
  theia.commands.registerCommand(SSH_GENERATE, () => {
    generateKeyPair();
  });
  theia.commands.registerCommand(SSH_CREATE, () => {
    createKeyPair();
  });
  theia.commands.registerCommand(SSH_DELETE, () => {
    deleteKeyPair();
  });
  theia.commands.registerCommand(SSH_VIEW, () => {
    viewPublicKey();
  });
  theia.commands.registerCommand(SSH_UPLOAD, () => {
    uploadPrivateKey();
  });
  theia.commands.registerCommand(SSH_ADD_TO_GITHUB, () => {
    addGitHubKey();
  });

  theia.workspace.registerTextDocumentContentProvider(PUBLIC_KEY_SCHEME, new PublicKeyContentProvider());

  return {
    configureSSH: async (gitHubActions: boolean) => showCommandPalette(gitHubActions),
  };
}

async function getHostName(message?: string): Promise<string | undefined> {
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

function getKeyFilePath(name: string): string {
  return resolve(os.homedir(), '.ssh', name.replace(new RegExp('\\.'), '_'));
}

async function updateConfig(hostName: string): Promise<void> {
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

async function showCommandPalette(gitHubActions: boolean): Promise<boolean> {
  const items: theia.QuickPickItem[] = [
    { label: SSH_GENERATE_FOR_HOST.label! },
    { label: SSH_GENERATE.label! },
    { label: SSH_VIEW.label! },
    { label: SSH_CREATE.label! },
    { label: SSH_DELETE.label! },
    { label: SSH_UPLOAD.label! },
  ];

  if (gitHubActions) {
    items.push({ label: SSH_ADD_TO_GITHUB.label!, showBorder: true });
  }

  const command = await theia.window.showQuickPick<theia.QuickPickItem>(items, {});

  if (command) {
    if (command.label === SSH_GENERATE_FOR_HOST.label) {
      await generateKeyPairForHost();
      return true;
    } else if (command.label === SSH_GENERATE.label) {
      await generateKeyPair();
      return true;
    } else if (command.label === SSH_VIEW.label) {
      await viewPublicKey();
      return true;
    } else if (command.label === SSH_CREATE.label) {
      await createKeyPair();
      return true;
    } else if (command.label === SSH_DELETE.label) {
      await deleteKeyPair({ gitCloneFlow: true });
      return true;
    } else if (command.label === SSH_UPLOAD.label) {
      await uploadPrivateKey();
      return true;
    } else if (command.label === SSH_ADD_TO_GITHUB.label) {
      await addGitHubKey({ gitCloneFlow: true });
      return true;
    }
  }

  return false;
}

/**
 * Generates new key for GitHub.
 */
async function generateGitHubKey(): Promise<cheApi.ssh.SshPair> {
  const key = await che.ssh.generate('vcs', 'github.com');
  await updateConfig('github.com');
  await writeKey('github.com', key.privateKey!);
  return key;
}

/**
 * Adds an existing public key to GitHub.
 */
async function addGitHubKey(config?: { gitCloneFlow?: boolean }): Promise<boolean> {
  const actions = config && config.gitCloneFlow ? [CONTINUE] : [];

  // get list of keys
  let keys: cheApi.ssh.SshPair[];
  try {
    keys = await che.ssh.getAll('vcs');
  } catch (e) {
    await theia.window.showErrorMessage(MESSAGE_GET_KEYS_FAILED, ...actions);
    return false;
  }

  if (keys.length === 0) {
    const GENERATE = 'Generate';
    const CANCEL = 'Cancel';
    const action = await theia.window.showWarningMessage(
      `${MESSAGE_NO_SSH_KEYS} Do you want to generate new one?`,
      GENERATE,
      CANCEL
    );
    if (action === GENERATE) {
      keys.push(await generateGitHubKey());
    } else {
      return false;
    }
  }

  // filter keys, leave only with names and that have public keys
  keys = keys.filter(key => key.name && key.publicKey);

  let key: cheApi.ssh.SshPair | undefined;
  if (keys.length === 1) {
    // only one key has been found
    // use it
    key = keys[0];
  } else {
    // pick key from the list
    const keyName = await theia.window.showQuickPick<theia.QuickPickItem>(
      keys.map(k => ({ label: k.name! })),
      {}
    );

    if (!keyName) {
      // user closed the popup
      return false;
    }

    key = keys.find(k => k.name && k.name === keyName.label);
  }

  try {
    if (key && key.publicKey) {
      await che.github.uploadPublicSshKey(key.publicKey);
      return true;
    } else {
      await theia.window.showErrorMessage('Unable to find public key.', ...actions);
    }
  } catch (error) {
    console.error(error.message);
    await theia.window.showErrorMessage('Failure to add public key to GitHub.', ...actions);
  }

  return false;
}

/**
 * Finds appropriate key for GitHub.
 */
async function getGitHubKey(): Promise<cheApi.ssh.SshPair | undefined> {
  const keys = await che.ssh.getAll('vcs');

  let key = keys.find(k => !!k.publicKey && !!k.name && k.name.startsWith('github.com') && k.publicKey);

  if (!key) {
    key = keys.find(k => !!k.publicKey && !!k.name && k.name.startsWith('default-') && k.publicKey);
  }

  return key;
}

/**
 * Displays a popup with proposal to upload public key to GitHub.
 *
 * @param tryAgain
 */
async function generateAndUploadKeyToGithub(tryAgain: boolean): Promise<boolean> {
  let key;
  try {
    key = await getGitHubKey();
  } catch (e) {
    await theia.window.showErrorMessage(MESSAGE_GET_KEYS_FAILED);
    return false;
  }

  const message = `Permission denied. Would you like to ${key ? '' : 'generate and'}
    upload the public SSH key to GitHub${tryAgain ? ' and try again' : ''}?`;
  const action = await theia.window.showWarningMessage(message, key ? 'Upload' : 'Generate and upload');

  try {
    if (action) {
      if (!key) {
        key = await generateGitHubKey();
      }

      if (key && key.publicKey) {
        await che.github.uploadPublicSshKey(key.publicKey);
        return true;
      }
    }
  } catch (error) {
    console.error(error.message);
  }

  return false;
}

async function writeKey(name: string, key: string): Promise<void> {
  const keyFile = getKeyFilePath(name);
  await appendFile(keyFile, key);
  await chmod(keyFile, '600');
}

async function generateKeyPair(): Promise<void> {
  const keyName = `default-${Date.now()}`;
  const key = await che.ssh.generate('vcs', keyName);
  await updateConfig(keyName);
  await writeKey(keyName, key.privateKey!);
  const viewAction = 'View';
  const action = await theia.window.showInformationMessage(
    'Key pair successfully generated, do you want to view the public key?',
    viewAction
  );
  if (action === viewAction && key.privateKey) {
    const document = await theia.workspace.openTextDocument({ content: key.publicKey })!;
    await theia.window.showTextDocument(document!);
  }

  await theia.window.showWarningMessage(MESSAGE_NEED_RESTART_WORKSPACE);
}

async function generateKeyPairForHost(): Promise<void> {
  const hostName = await getHostName();
  if (!hostName) {
    return;
  }
  const key = await che.ssh.generate('vcs', hostName);
  await updateConfig(hostName);
  await writeKey(hostName, key.privateKey!);
  const viewAction = 'View';
  const action = await theia.window.showInformationMessage(
    `Key pair for ${hostName} successfully generated, do you want to view the public key?`,
    viewAction
  );
  if (action === viewAction && key.privateKey) {
    const document = await theia.workspace.openTextDocument({ content: key.publicKey });
    await theia.window.showTextDocument(document!);
  }

  await theia.window.showWarningMessage(MESSAGE_NEED_RESTART_WORKSPACE);
}

async function createKeyPair(): Promise<void> {
  let hostName = await getHostName(MESSAGE_ENTER_KEY_NAME_OR_LEAVE_EMPTY);
  if (!hostName) {
    hostName = `default-${Date.now()}`;
  }
  const publicKey = await theia.window.showInputBox({ placeHolder: 'Enter public key' });
  const privateKey = await theia.window.showInputBox({ placeHolder: 'Enter private key' });

  try {
    await che.ssh.create({ name: hostName, service: 'vcs', publicKey: publicKey, privateKey });
    await updateConfig(hostName);
    await writeKey(hostName, privateKey!);
    await theia.window.showInformationMessage(`Key pair for ${hostName} successfully created`);
    await theia.window.showWarningMessage(MESSAGE_NEED_RESTART_WORKSPACE);
  } catch (error) {
    await theia.window.showErrorMessage(error);
  }
}

async function uploadPrivateKey(): Promise<void> {
  let hostName = await getHostName(MESSAGE_ENTER_KEY_NAME_OR_LEAVE_EMPTY);
  if (!hostName) {
    hostName = `default-${Date.now()}`;
  }

  const tempDir = await mkdtemp(join(os.tmpdir(), 'private-key-'));
  let uploadedFilePaths: theia.Uri[] | undefined;
  try {
    uploadedFilePaths = await theia.window.showUploadDialog({ defaultUri: theia.Uri.file(tempDir) });
  } catch (error) {
    console.error(error.message);
  }

  if (!uploadedFilePaths) {
    await theia.window.showErrorMessage('No private key has been uploaded');
    return;
  }

  const privateKeyPath = uploadedFilePaths[0];

  await access(privateKeyPath.path, R_OK);

  const privateKeyContent = (await readFile(privateKeyPath.path)).toString();

  try {
    await che.ssh.create({ name: hostName, service: 'vcs', privateKey: privateKeyContent });
    await updateConfig(hostName);
    await writeKey(hostName, privateKeyContent);
    const keyPath = getKeyFilePath(hostName);
    let passphrase;
    if (await isEncrypted(keyPath)) {
      passphrase = await theia.window.showInputBox({ placeHolder: 'Enter passphrase for key', password: true });
      if (passphrase) {
        await registerKey(keyPath, passphrase);
      } else {
        await theia.window.showErrorMessage('Passphrase for key was not entered');
      }
    }

    await theia.window.showInformationMessage(`Key pair for ${hostName} successfully uploaded`);
    await theia.window.showWarningMessage(MESSAGE_NEED_RESTART_WORKSPACE);
  } catch (error) {
    theia.window.showErrorMessage(error);
  }

  await unlink(privateKeyPath.path);
  await remove(tempDir);
}

async function deleteKeyPair(config?: { gitCloneFlow?: boolean }): Promise<void> {
  const actions = config && config.gitCloneFlow ? [CONTINUE] : [];

  let keys: cheApi.ssh.SshPair[];
  try {
    keys = await che.ssh.getAll('vcs');
  } catch (e) {
    await theia.window.showErrorMessage(MESSAGE_GET_KEYS_FAILED, ...actions);
    return;
  }

  if (keys.length === 0) {
    await theia.window.showWarningMessage(MESSAGE_NO_SSH_KEYS, ...actions);
    return;
  }

  const key = await theia.window.showQuickPick<theia.QuickPickItem>(
    keys.map(k => ({ label: k.name ? k.name : '' })),
    {}
  );

  if (!key) {
    return;
  }

  try {
    await che.ssh.deleteKey('vcs', key.label);
    const keyFile = getKeyFilePath(key.label);
    if (await pathExists(keyFile)) {
      await unlink(keyFile);
      await updateConfig(key.label);
    }

    theia.window.showInformationMessage(`Key ${key.label} successfully deleted`, ...actions);
  } catch (error) {
    theia.window.showErrorMessage(error, ...actions);
  }
}

async function registerKey(keyPath: string, passphrase: string): Promise<void> {
  try {
    await sshAdd(keyPath, passphrase);
  } catch (e) {
    if (e.includes('Could not open a connection to your authentication agent')) {
      await startSshAgent();
      await sshAdd(keyPath, passphrase);
    }
  }
}

async function isEncrypted(keyPath: string): Promise<boolean> {
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

function sshAdd(keyPath: string, passphrase: string): Promise<void> {
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

function startSshAgent(): Promise<void> {
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

async function viewPublicKey(config?: { gitCloneFlow?: boolean }): Promise<void> {
  const actions = config && config.gitCloneFlow ? [CONTINUE] : [];

  let keys: cheApi.ssh.SshPair[];
  try {
    keys = await che.ssh.getAll('vcs');
  } catch (e) {
    await theia.window.showErrorMessage(MESSAGE_GET_KEYS_FAILED, ...actions);
    return;
  }

  if (keys.length === 0) {
    await theia.window.showWarningMessage(MESSAGE_NO_SSH_KEYS, ...actions);
    return;
  }

  const key = await theia.window.showQuickPick<theia.QuickPickItem>(
    keys.map(k => ({ label: k.name ? k.name : '' })),
    {}
  );

  if (!key) {
    return;
  }

  try {
    const uri = theia.Uri.parse(`${PUBLIC_KEY_SCHEME}:ssh@${key.label}`);
    const document = await theia.workspace.openTextDocument(uri);
    if (document) {
      await theia.window.showTextDocument(document, { preview: true });
      return;
    }
  } catch (error) {
    console.error(error.message);
  }

  await theia.window.showErrorMessage(`Failure to open ${key.label}`, ...actions);
}

class PublicKeyContentProvider implements theia.TextDocumentContentProvider {
  async provideTextDocumentContent(uri: theia.Uri, token: theia.CancellationToken): Promise<string | undefined> {
    let keyName = uri.path;
    if (keyName.startsWith('ssh@')) {
      keyName = keyName.substring('ssh@'.length);
    }

    const key = await che.ssh.get('vcs', keyName);
    return key.publicKey;
  }
}

export function stop(): void {}
