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
import { PortChangesDetector } from './port-changes-detector';
import { Port } from './port';
import { WorkspaceHandler } from './workspace-handler';
import { PortRedirectListener } from './port-redirect-listener';
import { WorkspacePort } from './workspace-port';

/**
 * Plugin that is monitoring new port being opened and closed.
 * Check README file for more details
 * @author Florent Benoit
 */

// constants
const LISTEN_ALL_IPV4 = '0.0.0.0';
const LISTEN_ALL_IPV6 = '::';
const SERVER_REDIRECT_PATTERN = 'theia-redirect-';
const PORT_EXCLUDE_ENV_VAR_PREFIX: string = 'PORT_PLUGIN_EXCLUDE_';

// variables
let workspacePorts: WorkspacePort[];
let redirectPorts: WorkspacePort[];
let redirectListeners: Map<number, BusyPort>;
const excludedPorts: number[] = [];
let outputChannel: theia.OutputChannel;

// map a listener and the workspace port used
export interface BusyPort {

    portRedirectListener: PortRedirectListener;

    workspacePort: WorkspacePort;

}

export interface MessageItem {
    title: string;
}

/**
 * Prompt user to create a port redirect for the specific port
 * @param port the port that needs to be redirected
 * @param redirectMessage the message if there are 'free ports' in workspace
 * @param errorMessage  if no free port are available
 */
async function askRedirect(port: Port, redirectMessage: string, errorMessage: string) {

    // grab a free redirect
    if (redirectPorts.length === 0) {
        await theia.window.showErrorMessage(errorMessage, { modal: true });
        return;
    }

    const interactions: MessageItem[] = [{ title: 'yes' }];
    const result = await theia.window.showInformationMessage(redirectMessage, ...interactions);
    if (result && result.title === 'yes') {
        // takes first available port
        const workspacePort = redirectPorts.pop()!;

        // start a new listener
        const portRedirectListener = new PortRedirectListener(parseInt(workspacePort.portNumber, 10), 'localhost', port.portNumber);
        portRedirectListener.start();

        // store port taken
        const busyPort = { portRedirectListener, workspacePort };
        redirectListeners.set(port.portNumber, busyPort);

        // show redirect
        const redirectInteractions: MessageItem[] = [{ title: 'Open Link' }];
        const msg = `Redirect is now enabled on port ${port.portNumber}. External URL is ${workspacePort.url}`;
        const resultShow = await theia.window.showInformationMessage(msg, ...redirectInteractions);
        if (resultShow && resultShow.title === 'Open Link') {
            theia.commands.executeCommand('mini-browser.openUrl', workspacePort.url);
        }
    }
}

// Callback when a new port is being opened in workspace
async function onOpenPort(port: Port) {

    // skip excluded
    if (excludedPorts.includes(port.portNumber)) {
        // this port is excluded so just print a notice but does not propose a redirect
        outputChannel.appendLine(`Ignoring excluded port ${port.portNumber}`);
        return;
    }

    // handle ephemeral ports
    if (port.portNumber >= 32000) {
        // this port is ephemeral so just print a notice but does not propose a redirect
        outputChannel.appendLine(`Ephemeral port now listening on port ${port.portNumber} (port range >= 32000). No redirect proposed for ephemerals.`);
        return;
    }

    // if not listening on 0.0.0.0 then raise a prompt to add a port redirect
    if (port.interfaceListen !== LISTEN_ALL_IPV4 && port.interfaceListen !== LISTEN_ALL_IPV6) {
        const desc = `A new process is now listening on port ${port.portNumber} but is listening on interface ${port.interfaceListen} which is internal.
        You should change to be remotely available. Would you want to add a redirect for this port so it becomes available ?`;
        const err = `A new process is now listening on port ${port.portNumber} but is listening on interface ${port.interfaceListen} which is internal.
        This port is not available outside. You should change the code to listen on 0.0.0.0 for example.`;
        await askRedirect(port, desc, err);
        return;
    }

    // check now if the port is in workspace definition ?
    const matchingWorkspacePort = workspacePorts.find(workspacePort => workspacePort.portNumber === port.portNumber.toString());

    // if there, show prompt
    if (matchingWorkspacePort) {

        // internal stuff, no need to display anything
        if (matchingWorkspacePort.serverName.startsWith(SERVER_REDIRECT_PATTERN)) {
            return;
        }

        // check if endpoint has preview url, and if so do not show dialog to avoid duplication with task plugin
        if (matchingWorkspacePort.previewUrl) {
            return;
        }

        const interactions: MessageItem[] = [{ title: 'Open Link' }];
        const msg = `A process is now listening on port ${matchingWorkspacePort.portNumber}. External URL is ${matchingWorkspacePort.url}`;
        const result = await theia.window.showInformationMessage(msg, { modal: true }, ...interactions);
        if (result && result.title === 'Open Link') {
            theia.commands.executeCommand('mini-browser.openUrl', matchingWorkspacePort.url);
        }
    } else {
        const desc = `A new process is now listening on port ${port.portNumber} but this port is not exposed in the workspace as a server.
         Would you want to add a redirect for this port so it becomes available ?`;
        const err = `A new process is now listening on port ${port.portNumber} but this port is not exposed in the workspace as a server.
         You should add a new server with this port in order to access it`;
        await askRedirect(port, desc, err);
    }
    console.info(`The port ${port.portNumber} is now listening on interface ${port.interfaceListen}`);
}

function onClosedPort(port: Port) {

    // free redirect listener if there is one
    const portNumber = port.portNumber;
    if (redirectListeners.has(portNumber)) {

        // stop the redirect
        const busyPort = redirectListeners.get(portNumber)!;
        busyPort.portRedirectListener.stop();

        // free up the port
        redirectPorts.push(busyPort.workspacePort);

        // remove entry
        redirectListeners.delete(portNumber);
    }

    // just log trace
    console.info(`The port ${port.portNumber} is no longer listening on interface ${port.interfaceListen}`);
}

export async function start(context: theia.PluginContext): Promise<void> {

    outputChannel = theia.window.createOutputChannel('Ports Plug-in');

    // first, grab ports of workspace
    const workspaceHandler = new WorkspaceHandler();
    workspacePorts = await workspaceHandler.getWorkspacePorts();

    redirectListeners = new Map<number, BusyPort>();
    redirectPorts = workspacePorts.filter(port => port.serverName.startsWith(SERVER_REDIRECT_PATTERN));

    // initiate excluded ports
    const excludedPortProperties: string[] = Object.keys(process.env).filter(key => key.startsWith(PORT_EXCLUDE_ENV_VAR_PREFIX));
    excludedPortProperties.forEach(key => {
        const value = process.env[key]!.toLocaleLowerCase() || '';
        if (value !== 'no' && value !== 'false') {
            excludedPorts.push(parseInt(key.substring(PORT_EXCLUDE_ENV_VAR_PREFIX.length)));
        }
    });

    const portChangesDetector = new PortChangesDetector();
    portChangesDetector.onDidOpenPort(onOpenPort);
    portChangesDetector.onDidClosePort(onClosedPort);

    // start port changes
    await portChangesDetector.init();
    portChangesDetector.check();

}

export function stop() {

}
