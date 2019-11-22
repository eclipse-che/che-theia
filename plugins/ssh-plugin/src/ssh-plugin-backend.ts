/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as theia from '@theia/plugin';
import * as che from '@eclipse-che/plugin';
import { RemoteSshKeyManager, SshKeyManager } from './node/ssh-key-manager';
import { che as cheApi } from '@eclipse-che/api';
import { resolve, join } from 'path';
import { pathExists, unlink, ensureFile, chmod, readFile, writeFile, appendFile } from 'fs-extra';
import * as os from 'os';
import { accessSync, mkdtempSync, readFileSync, rmdirSync, unlinkSync } from 'fs';
import { R_OK } from 'constants';

export async function start() {

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
            // tslint:disable-next-line:no-any
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
                    let keys: cheApi.ssh.SshPair[] = [];
                    try {
                        keys = await getKeys(sshKeyManager);
                    } catch (e) {
                        // No SSH key pair has been defined, do nothing.
                    }
                    // If the remote repository is a GitHub repository, ask to upload a public SSH key.
                    if (out.indexOf('git@github.com') > -1) {
                        // Currently multi-user che-theia doesn't support GiHub oAuth.
                        if (isMultiUser()) {
                            showWarningMessage(keys.length === 0, 'GitHub');
                            return;
                        }
                        switch (command) {
                            case 'clone': {
                                if (await askToGenerateIfEmptyAndUploadKeyToGithub(keys, true)) {
                                    await git.clone(url, path.substring(0, path.lastIndexOf('/')));
                                    theia.window.showInformationMessage(`Project ${url} successfully cloned to ${path}`);
                                }
                                break;
                            }
                            case 'push': {
                                if (await askToGenerateIfEmptyAndUploadKeyToGithub(keys, false)) {
                                    theia.window.showInformationMessage('The public SSH key has been uploaded to Github, please try to push again.');
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

    const isMultiUser = (): boolean => !!process.env['KEYCLOAK_SERVICE_HOST'];

    const showWarningMessage = (showGenerate: boolean, gitProviderName?: string) =>
        theia.window.showWarningMessage(`Permission denied, please ${showGenerate ? 'generate (F1 => ' + GENERATE.label + ') and ' : ''}
        upload your public SSH key to ${gitProviderName ? gitProviderName : 'the Git provider'} and try again. To get the public key press F1 => ${VIEW.label}`);

    theia.plugins.onDidChange(onChange);

    const askToGenerateIfEmptyAndUploadKeyToGithub = async (keys: cheApi.ssh.SshPair[], tryAgain: boolean): Promise<boolean> => {
        let key = keys.find(k => !!k.publicKey && !!k.name && (k.name.startsWith('github.com') || k.name.startsWith('default-')));
        const message = `Permission denied, would you like to ${!key ? 'generate and ' : ''}upload the public SSH key to GitHub${tryAgain ? ' and try again' : ''}?`;
        const action = await theia.window.showWarningMessage(message, key ? 'Upload' : 'Generate and upload');
        if (action) {
            if (!key) {
                key = await sshKeyManager.generate('vcs', 'github.com');
                await updateConfig('github.com');
                await writeKey('github.com', key.privateKey!);
            }
            if (key && key.publicKey) {
                await che.github.uploadPublicSshKey(key.publicKey);
                return true;
            }
            return false;
        } else {
            return false;
        }
    };

    const sshKeyManager = new RemoteSshKeyManager();
    const GENERATE_FOR_HOST: theia.CommandDescription = {
        id: 'ssh:generate_for_host',
        label: 'SSH: generate key pair for particular host...'
    };
    const GENERATE: theia.CommandDescription = {
        id: 'ssh:generate',
        label: 'SSH: generate key pair...'
    };
    const CREATE: theia.CommandDescription = {
        id: 'ssh:create',
        label: 'SSH: create key pair...'
    };
    const DELETE: theia.CommandDescription = {
        id: 'ssh:delete',
        label: 'SSH: delete key pair...'
    };
    const VIEW: theia.CommandDescription = {
        id: 'ssh:view',
        label: 'SSH: view public key...'
    };
    const UPLOAD: theia.CommandDescription = {
        id: 'ssh:upload',
        label: 'SSH: upload private key...'
    };

    theia.commands.registerCommand(GENERATE_FOR_HOST, () => {
        generateKeyPairForHost(sshKeyManager);
    });
    theia.commands.registerCommand(GENERATE, () => {
        generateKeyPair(sshKeyManager);
    });
    theia.commands.registerCommand(CREATE, () => {
        createKeyPair(sshKeyManager);
    });
    theia.commands.registerCommand(DELETE, () => {
        deleteKeyPair(sshKeyManager);
    });
    theia.commands.registerCommand(VIEW, () => {
        viewPublicKey(sshKeyManager);
    });
    theia.commands.registerCommand(UPLOAD, () => {
        uploadPrivateKey(sshKeyManager);
    });
}

const RESTART_WARNING_MESSAGE = 'Che Git plugin can leverage the generated keys now. To make them available in every workspace containers please restart your workspace.';
const ENTER_KEY_NAME_OR_LEAVE_EMPTY_MESSAGE = 'Please provide a hostname (e.g. github.com) or leave empty to setup default name';

const hostNamePattern = new RegExp('[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*');

const getHostName = async (message?: string) => await theia.window.showInputBox({
    placeHolder: message ? message : 'Please provide a hostname e.g. github.com',
    validateInput: (text: string) => {
        if (!hostNamePattern.test(text)) {
            return 'Invalid hostname';
        }
    }
});

const getKeyFilePath = (name: string) => resolve(os.homedir(), '.ssh', name.replace(new RegExp('\\.'), '_'));

const updateConfig = async (hostName: string) => {
    const configFile = resolve(os.homedir(), '.ssh', 'config');
    await ensureFile(configFile);
    await chmod(configFile, '644');
    const keyConfig = `\nHost ${hostName.startsWith('default-') ? '*' : hostName}\nIdentityFile ${getKeyFilePath(hostName)}\nStrictHostKeyChecking = no\n`;
    const configContentBuffer = await readFile(configFile);
    if (configContentBuffer.indexOf(keyConfig) >= 0) {
        const newConfigContent = configContentBuffer.toString().replace(keyConfig, '');
        await writeFile(configFile, newConfigContent);
    } else {
        await appendFile(configFile, keyConfig);
    }
};

const writeKey = async (name: string, key: string) => {
    const keyFile = getKeyFilePath(name);
    await appendFile(keyFile, key);
    await chmod(keyFile, '600');
};

const showWarning = async (message: string) => {
    await theia.window.showWarningMessage(message);
};

const generateKeyPair = async (sshkeyManager: SshKeyManager) => {
    const keyName = `default-${Date.now()}`;
    const key = await sshkeyManager.generate('vcs', keyName);
    await updateConfig(keyName);
    await writeKey(keyName, key.privateKey!);
    const viewAction = 'View';
    const action = await theia.window.showInformationMessage('Key pair successfully generated, do you want to view the public key?', viewAction);
    if (action === viewAction && key.privateKey) {
        const document = await theia.workspace.openTextDocument({ content: key.publicKey })!;
        await theia.window.showTextDocument(document!);
    }
    showWarning(RESTART_WARNING_MESSAGE);
};

const generateKeyPairForHost = async (sshkeyManager: SshKeyManager) => {
    const hostName = await getHostName();
    if (!hostName) {
        return;
    }
    const key = await sshkeyManager.generate('vcs', hostName);
    await updateConfig(hostName);
    await writeKey(hostName, key.privateKey!);
    const viewAction = 'View';
    const action = await theia.window.showInformationMessage(`Key pair for ${hostName} successfully generated, do you want to view the public key?`, viewAction);
    if (action === viewAction && key.privateKey) {
        const document = await theia.workspace.openTextDocument({ content: key.publicKey });
        await theia.window.showTextDocument(document!);
    }
    showWarning(RESTART_WARNING_MESSAGE);
};

const createKeyPair = async (sshkeyManager: SshKeyManager) => {
    let hostName = await getHostName(ENTER_KEY_NAME_OR_LEAVE_EMPTY_MESSAGE);
    if (!hostName) {
        hostName = `default-${Date.now()}`;
    }
    const publicKey = await theia.window.showInputBox({ placeHolder: 'Enter public key' });
    const privateKey = await theia.window.showInputBox({ placeHolder: 'Enter private key' });

    try {
        await sshkeyManager.create({ name: hostName, service: 'vcs', publicKey: publicKey, privateKey });
        await updateConfig(hostName);
        await writeKey(hostName, privateKey!);
        await theia.window.showInformationMessage(`Key pair for ${hostName} successfully created`);
        showWarning(RESTART_WARNING_MESSAGE);
    } catch (error) {
        theia.window.showErrorMessage(error);
    }
};

const uploadPrivateKey = async (sshkeyManager: SshKeyManager) => {
    let hostName = await getHostName(ENTER_KEY_NAME_OR_LEAVE_EMPTY_MESSAGE);
    if (!hostName) {
        hostName = `default-${Date.now()}`;
    }

    const tempDir = mkdtempSync(join(os.tmpdir(), 'private-key-'));
    const uploadedFilePaths = await theia.window.showUploadDialog({ defaultUri: theia.Uri.file(tempDir) });

    if (!uploadedFilePaths || uploadPrivateKey.length === 0) {
        theia.window.showErrorMessage('No private key has been uploaded');
        return;
    }

    const privateKeyPath = uploadedFilePaths[0];

    accessSync(privateKeyPath.path, R_OK);

    const privateKeyContent = readFileSync(privateKeyPath.path).toString();

    try {
        await sshkeyManager.create({ name: hostName, service: 'vcs', privateKey: privateKeyContent });
        await updateConfig(hostName);
        await writeKey(hostName, privateKeyContent!);
        theia.window.showInformationMessage(`Key pair for ${hostName} successfully uploaded`);
        showWarning(RESTART_WARNING_MESSAGE);
    } catch (error) {
        theia.window.showErrorMessage(error);
    }

    unlinkSync(privateKeyPath.path);
    rmdirSync(tempDir, { recursive: true });
};

const getKeys = async (sshKeyManager: SshKeyManager): Promise<cheApi.ssh.SshPair[]> => {
    const keys: cheApi.ssh.SshPair[] = await sshKeyManager.getAll('vcs');
    if (!keys || keys.length < 1) {
        throw new Error('No SSH key pair has been defined.');
    }
    return keys;
};

const deleteKeyPair = async (sshkeyManager: SshKeyManager) => {
    let keys: cheApi.ssh.SshPair[];
    try {
        keys = await getKeys(sshkeyManager);
    } catch (error) {
        showWarning('Delete SSH key operation is interrupted: ' + error.message);
        return;
    }
    const keyResp = await theia.window.showQuickPick<theia.QuickPickItem>(keys.map(key =>
        ({ label: key.name ? key.name : '' })), {});
    const keyName = keyResp ? keyResp.label : '';

    try {
        await sshkeyManager.delete('vcs', keyName);
        const keyFile = getKeyFilePath(keyName);
        if (await pathExists(keyFile)) {
            await unlink(keyFile);
            await updateConfig(keyName);
        }
        theia.window.showInformationMessage(`Key ${keyName} successfully deleted`);
    } catch (error) {
        theia.window.showErrorMessage(error);
    }
};

const viewPublicKey = async (sshkeyManager: SshKeyManager) => {
    let keys: cheApi.ssh.SshPair[];
    try {
        keys = await getKeys(sshkeyManager);
    } catch (error) {
        showWarning('View public SSH key operation is interrupted: ' + error.message);
        return;
    }
    const keyResp = await theia.window.showQuickPick<theia.QuickPickItem>(keys.map(key =>
        ({ label: key.name ? key.name : '' })), {});
    const keyName = keyResp ? keyResp.label : '';
    try {
        const key = await sshkeyManager.get('vcs', keyName);
        const document = await theia.workspace.openTextDocument({ content: key.publicKey });
        theia.window.showTextDocument(document!);
    } catch (error) {
        theia.window.showErrorMessage(error);
    }
};

export function stop() {

}
