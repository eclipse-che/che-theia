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
import { RemoteSshKeyManager, SshKeyManager } from './node/ssh-key-manager';
import { che as cheApi } from '@eclipse-che/api';
import { resolve } from 'path';
import { pathExists, unlink, ensureFile, chmod, readFile, writeFile, appendFile } from 'fs-extra';
import * as os from 'os';

export async function start() {
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
}

const RESTART_WARNING_MESSAGE = 'Che Git plugin can leverage the generated keys now. To make them available in every workspace containers please restart your workspace.';

const hostNamePattern = new RegExp('[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*');

const getHostName = async () => await theia.window.showInputBox({
    placeHolder: 'Please provide a hostname e.g. github.com',
    validateInput: text => {
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
    theia.window.showWarningMessage(message);
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
    const hostName = await getHostName();
    if (!hostName) {
        return;
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
