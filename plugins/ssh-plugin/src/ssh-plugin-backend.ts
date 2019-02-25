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
import { RemoteSshKeyManager, SshKeyManager, CheService } from './node/ssh-key-manager';
import { che as cheApi } from '@eclipse-che/api';

export async function start() {
    const sshKeyManager = new RemoteSshKeyManager();
    const GENERATE: theia.Command = {
        id: 'ssh:generate',
        label: 'SSH: generate key pair...'
    };
    const CREATE: theia.Command = {
        id: 'ssh:create',
        label: 'SSH: create key pair...'
    };
    const DELETE: theia.Command = {
        id: 'ssh:delete',
        label: 'SSH: delete key pair...'
    };
    const VIEW: theia.Command = {
        id: 'ssh:view',
        label: 'SSH: view public key...'
    };

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

const getSshServiceName = async function (): Promise<string> {
    /**
     * Known Che services which can use the SSH key pairs.
     */
    const services: CheService[] = [
        {
            name: 'vcs',
            displayName: 'VCS',
            description: 'SSH keys used by Che VCS plugins'
        },
        {
            name: 'machine',
            displayName: 'Workspace Containers',
            description: 'SSH keys injected into all Workspace Containers'
        }
    ];

    const option: theia.QuickPickOptions = {
        matchOnDescription: true,
        matchOnDetail: true,
        canPickMany: false,
        placeHolder: 'Select object:'
    };
    const sshServiceValue = await theia.window.showQuickPick<theia.QuickPickItem>(services.map(service =>
        ({
            label: service.displayName,
            description: service.description,
            detail: service.name,
            name: service.name
        })), option);
    if (sshServiceValue) {
        return Promise.resolve(sshServiceValue.label);
    } else {
        return Promise.resolve('');
    }
};

const generateKeyPair = async function (sshkeyManager: SshKeyManager): Promise<void> {
    const keyName = await theia.window.showInputBox({ placeHolder: 'Please provide a key pair name' });
    const key = await sshkeyManager.generate(await getSshServiceName(), keyName ? keyName : '');
    const viewAction = 'View';
    const action = await theia.window.showInformationMessage('Do you want to view the generated private key?', viewAction);
    if (action === viewAction && key.privateKey) {
        theia.workspace.openTextDocument({ content: key.privateKey });
    }
};

const createKeyPair = async function (sshkeyManager: SshKeyManager): Promise<void> {
    const keyName = await theia.window.showInputBox({ placeHolder: 'Please provide a key pair name' });
    const publicKey = await theia.window.showInputBox({ placeHolder: 'Enter public key' });

    await sshkeyManager
        .create({ name: keyName ? keyName : '', service: await getSshServiceName(), publicKey: publicKey })
        .then(() => {
            theia.window.showInformationMessage('Key "' + `${keyName}` + '" successfully created');
        })
        .catch(error => {
            theia.window.showErrorMessage(error);
        });
};

const deleteKeyPair = async function (sshkeyManager: SshKeyManager): Promise<void> {
    const sshServiceName = await getSshServiceName();
    const keys: cheApi.ssh.SshPair[] = await sshkeyManager.getAll(sshServiceName);
    const keyResp = await theia.window.showQuickPick<theia.QuickPickItem>(keys.map(key =>
        ({ label: key.name ? key.name : '' })), {});
    const keyName = keyResp ? keyResp.label : '';
    await sshkeyManager
        .delete(sshServiceName, keyName)
        .then(() => {
            theia.window.showInformationMessage('Key "' + `${keyName}` + '" successfully deleted');
        })
        .catch(error => {
            theia.window.showErrorMessage(error);
        });
};

const viewPublicKey = async function (sshkeyManager: SshKeyManager): Promise<void> {
    const sshServiceName = await getSshServiceName();
    const keys: cheApi.ssh.SshPair[] = await sshkeyManager.getAll(sshServiceName);
    const keyResp = await theia.window.showQuickPick<theia.QuickPickItem>(keys.map(key =>
        ({ label: key.name ? key.name : '' })), {});
    const keyName = keyResp ? keyResp.label : '';
    await sshkeyManager
        .get(sshServiceName, keyName)
        .then(key => {
            theia.workspace.openTextDocument({ content: key.publicKey });
        })
        .catch(error => {
            theia.window.showErrorMessage(error);
        });
};

export function stop() {

}
