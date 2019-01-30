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
import * as path from 'path';

/**
 * Welcome Page
 */
export class WelcomePage {
    static readonly ECLIPSE_CHE = 'Eclipse Che';
    static readonly ECLIPSE_CHE_SUBTITLE = 'Welcome To Your Cloud Developer Workspace ';

    static readonly DOCUMENTATION = 'https://www.eclipse.org/che/docs/che-7';
    static readonly MATTERMOST = 'https://mattermost.eclipse.org/eclipse/channels/eclipse-che';

    constructor(readonly pluginContext: theia.PluginContext) {
    }

    protected renderHeader(context: theia.PluginContext): string {

        // Local path to main script run in the webview
        const imgOnDisk = theia.Uri.file(path.join(context.extensionPath, 'resources', 'che-logo.svg'));
        // And the uri we use to load this script in the webview
        const imgURI = imgOnDisk.with({ scheme: 'theia-resource' });

        return `<div class="che-welcome-header">
         <div class="che-welcome-header-title" ><div class="svg-container"><img src=${imgURI} /></div>${WelcomePage.ECLIPSE_CHE}</div>
        <span class='che-welcome-header-subtitle'>${WelcomePage.ECLIPSE_CHE_SUBTITLE}</span>
    </div>`;
    }

    private async renderCommandKeyBinding(commandId: string): Promise<string> {
        const availableKeys = await theia.commands.getKeyBinding(commandId);

        if (availableKeys && availableKeys.length > 0) {
            const keybindingSeperator = /<match>\+<\/match>/g;
            const regex = new RegExp(keybindingSeperator);
            const keyMappings = await Promise.all(availableKeys.map(async (keyBinding: any) => {

                const updatedKeyBinding = keyBinding.value.replace(regex, '+');
                const keys = updatedKeyBinding.split('+');
                if (keys.length > 0) {
                    let rows: any[] = [];

                    await Promise.all(keys.map(async (key: any) => {
                        let updatedKey = key;
                        if ((await theia.env.getClientOperatingSystem()) === theia.OperatingSystem.OSX) {
                            if (updatedKey === 'ctrlcmd') {
                                updatedKey = '⌘ cmd';
                            } else if (updatedKey === 'alt') {
                                updatedKey = '⎇ alt';
                            }
                        }
                        if (updatedKey === 'shift') {
                            updatedKey = '⇧ shift';
                        }
                        rows.push(`<span class="che-welcome-keybinding-key">${updatedKey}</span>`);
                    }));
                    return `<div class="che-welcome-keybinding" title=${availableKeys[0].value}>${rows}</div>`;
                }
            }));

            return keyMappings.join(' or ')



        }
        return '';
    }

    private async renderStart(): Promise<string> {
        const newFile = `<div class="che-welcome-command-desc"><a href='#' onClick="executeCommand('file.newFile')">New File...</a>${await this.renderCommandKeyBinding('file.newFile')}</div>`;
        const gitClone = `<div class="che-welcome-command-desc"><a href='#' onClick="executeCommand('git.clone')">Git Clone...</a>${await this.renderCommandKeyBinding('git.clone')}</div>`;
        return `<div class='che-welcome-section'>
            <h3 class='che-welcome-section-header'><i class='fa fa-file'></i>New</h3>
            <div class='che-welcome-action-container'>
                ${newFile}
            </div>
            <div class='che-welcome-action-container'>
                ${gitClone}
            </div>

        </div>`;

    }

    private async renderOpen(): Promise<string> {

        const open = `<div class="che-welcome-command-desc"><a href='#' onClick="executeCommand('workspace:open')">Open Files...</a>${await this.renderCommandKeyBinding('workspace:open')}</div>`;
        const openCommandPalette = `<div class="che-welcome-command-desc"><a href='#' onClick="executeCommand('workbench.action.showCommands')">Open Command Palette...</a>${await this.renderCommandKeyBinding('workbench.action.showCommands')}</div>`;
        return `<div class='che-welcome-section'>
            <h3 class='che-welcome-section-header'><i class='fa fa-folder-open'></i>Open</h3>
            <div class='che-welcome-action-container'>
                ${open}
            </div>
            <div class='che-welcome-action-container'>
                ${openCommandPalette}
            </div>

        </div>`;
    }

    private async renderSettings(): Promise<string> {
        return `<div class='che-welcome-section'>
            <h3 class='che-welcome-section-header'>
                <i class='fa fa-cog'></i>
                Settings
            </h3>
            <div class='che-welcome-action-container'>
                <div class="che-welcome-command-desc">
                    <a href='#' onClick="executeCommand('preferences:open')">Open Preferences</a>${await this.renderCommandKeyBinding('preferences:open')}
                </div>
            </div>
            <div class='che-welcome-action-container'>

                <div class="che-welcome-command-desc">
                    <a href='#' onClick="executeCommand('keymaps:open')">Open Keyboard Shortcuts</a>${await this.renderCommandKeyBinding('keymaps:open')}
                </div>
            </div>
        </div>;`
    }

    private async renderHelp(): Promise<string> {
        return `<div class='che-welcome-section'>
            <h3 class='che-welcome-section-header'>
                <i class='fa fa-question-circle'></i>
                Help
            </h3>
            <div class='che-welcome-action-container'>
                <a href=${WelcomePage.DOCUMENTATION} target='_blank'>Documentation</a>
            </div>
            <div class='che-welcome-action-container'>
                <a href=${WelcomePage.MATTERMOST} target='_blank'>Community chat</a>
            </div>
        </div>`;
    }

    public async render(context: theia.PluginContext) {
        return `<div class='che-welcome-container'>
            ${this.renderHeader(context)}
            <div class='flex-grid'>
                <div class='col'>
                    ${await this.renderStart()}
                </div>
            </div>
            <div class='flex-grid'>
                <div class='col'>
                    ${await this.renderOpen()}
                </div>
            </div>
            <div class='flex-grid'>
                <div class='col'>
                    ${await this.renderSettings()}
                </div>
            </div>
            <div class='flex-grid'>
                <div class='col'>
                    ${await this.renderHelp()}
                </div>
            </div>
        </div>`;
    }
}
