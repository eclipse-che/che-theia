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
import * as fs from 'fs';
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

const getHostName = async function (): Promise<string> {
    const hostName = await theia.window.showInputBox({ placeHolder: 'Please provide a Host name e.g. github.com' });
    return hostName ? hostName : '';
};

const updateConfig = function (hostName: string): void {
    const sshDir = os.homedir() + '/.ssh';
    const configFile = sshDir + '/config';
    if (!fs.existsSync(configFile)) {
        if (!fs.existsSync(sshDir)) {
            fs.mkdirSync(sshDir);
        }
        fs.appendFileSync(configFile, '');
        fs.chmodSync(configFile, '644');
    }
    const keyConfig = `\nHost ${hostName.startsWith('default-') ? '*' : hostName}\nIdentityFile ${sshDir}/${hostName.replace('.', '_')}\n`;
    const configContent = fs.readFileSync(configFile).toString();
    if (configContent.indexOf(keyConfig) >= 0) {
        const newConfigContent = configContent.replace(keyConfig, '');
        fs.writeFileSync(configFile, newConfigContent);
    } else {
        fs.appendFileSync(configFile, keyConfig);
    }
};

const writeKey = function (name: string, key: string): void {
    const keyFile = os.homedir() + '/.ssh/' + name.replace('.', '_');
    fs.appendFileSync(keyFile, key);
    fs.chmodSync(keyFile, '600');
};

const generateKeyPair = async function (sshkeyManager: SshKeyManager): Promise<void> {
    const keyName = `default-${Date.now()}`;
    const key = await sshkeyManager.generate('vcs', keyName);
    updateConfig(keyName);
    writeKey(keyName, key.privateKey);
    const viewAction = 'View';
    const action = await theia.window.showInformationMessage('Key pair successfully generated, do you want to view the public key?', viewAction);
    if (action === viewAction && key.privateKey) {
        const document = await theia.workspace.openTextDocument({ content: key.publicKey });
        await theia.window.showTextDocument(document);
    }
};

const generateKeyPairForHost = async function (sshkeyManager: SshKeyManager): Promise<void> {
    const hostName = await getHostName();
    const key = await sshkeyManager.generate('vcs', hostName);
    updateConfig(hostName);
    writeKey(hostName, key.privateKey);
    const viewAction = 'View';
    const action = await theia.window.showInformationMessage(`Key pair for ${hostName} successfully generated, do you want to view the public key?`, viewAction);
    if (action === viewAction && key.privateKey) {
        const document = await theia.workspace.openTextDocument({ content: key.publicKey });
        await theia.window.showTextDocument(document);
    }
};

const createKeyPair = async function (sshkeyManager: SshKeyManager): Promise<void> {
    const hostName = await getHostName();
    const publicKey = await theia.window.showInputBox({ placeHolder: 'Enter public key' });
    const privateKey = await theia.window.showInputBox({ placeHolder: 'Enter private key' });

    await sshkeyManager
        .create({ name: hostName, service: 'vcs', publicKey: publicKey, privateKey })
        .then(async () => {
            theia.window.showInformationMessage('Key "' + `${hostName}` + '" successfully created');
            updateConfig(hostName);
            writeKey(hostName, privateKey);
        })
        .catch(error => {
            theia.window.showErrorMessage(error);
        });
};

const deleteKeyPair = async function (sshkeyManager: SshKeyManager): Promise<void> {
    const keys: cheApi.ssh.SshPair[] = await sshkeyManager.getAll('vcs');
    const keyResp = await theia.window.showQuickPick<theia.QuickPickItem>(keys.map(key =>
        ({ label: key.name ? key.name : '' })), {});
    const keyName = keyResp ? keyResp.label : '';
    await sshkeyManager
        .delete('vcs', keyName)
        .then(() => {
            const keyFile = os.homedir() + '/.ssh/' + keyName.replace('.', '_');
            if (fs.existsSync(keyFile)) {
                fs.unlinkSync(keyFile);
                updateConfig(keyName);
            }
            theia.window.showInformationMessage('Key "' + `${keyName}` + '" successfully deleted');
        })
        .catch(error => {
            theia.window.showErrorMessage(error);
        });
};

const viewPublicKey = async function (sshkeyManager: SshKeyManager): Promise<void> {
    const keys: cheApi.ssh.SshPair[] = await sshkeyManager.getAll('vcs');
    const keyResp = await theia.window.showQuickPick<theia.QuickPickItem>(keys.map(key =>
        ({ label: key.name ? key.name : '' })), {});
    const keyName = keyResp ? keyResp.label : '';
    await sshkeyManager
        .get('vcs', keyName)
        .then(async key => {
            const document = await theia.workspace.openTextDocument({ content: key.publicKey });
            theia.window.showTextDocument(document);
        })
        .catch(error => {
            theia.window.showErrorMessage(error);
        });
};

export function stop() {

}
