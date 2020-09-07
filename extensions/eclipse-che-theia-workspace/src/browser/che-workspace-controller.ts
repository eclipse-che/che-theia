/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { inject, injectable } from 'inversify';
import { CheApiService } from '@eclipse-che/theia-plugin-ext/lib/common/che-protocol';
import { che } from '@eclipse-che/api';
import { AbstractDialog, ConfirmDialog, DefaultUriLabelProviderContribution } from '@theia/core/lib/browser';
import { Message } from '@theia/core/lib/browser/widgets';
import { Key } from '@theia/core/lib/browser/keyboard/keys';
import { CheWorkspaceCommands } from './che-workspace-contribution';
import { QuickOpenCheWorkspace } from './che-quick-open-workspace';
import { FileDialogService, FileDialogTreeFilters, OpenFileDialogProps } from '@theia/filesystem/lib/browser';
import {
    WorkspaceService,
    WorkspacePreferences
} from '@theia/workspace/lib/browser';
import URI from '@theia/core/lib/common/uri';
import { THEIA_EXT, VSCODE_EXT } from '@theia/workspace/lib/common';
import { QuickOpenWorkspace } from '@theia/workspace/lib/browser/quick-open-workspace';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { FileStat } from '@theia/filesystem/lib/common/files';

const YAML = require('js-yaml');

export class StopWorkspaceDialog extends AbstractDialog<boolean | undefined> {
    protected confirmed: boolean | undefined = true;
    protected readonly dontStopButton: HTMLButtonElement;

    constructor() {
        super({
            title: 'Open Workspace'
        });

        this.contentNode.appendChild(this.createMessageNode('Do you want to stop current workspace?'));
        this.appendCloseButton('Cancel');
        this.dontStopButton = this.appendDontStopButton();
        this.appendAcceptButton('Yes');
    }

    get value(): boolean | undefined {
        return this.confirmed;
    }

    protected appendDontStopButton(): HTMLButtonElement {
        const button = this.createButton('No');
        this.controlPanel.appendChild(button);
        button.classList.add('secondary');
        return button;
    }

    protected onAfterAttach(msg: Message): void {
        super.onAfterAttach(msg);
        this.addKeyListener(this.dontStopButton, Key.ENTER, () => {
            this.confirmed = false;
            this.accept();
        }, 'click');
    }

    protected onCloseRequest(msg: Message): void {
        super.onCloseRequest(msg);
        this.confirmed = undefined;
        this.accept();
    }

    protected createMessageNode(msg: string | HTMLElement): HTMLElement {
        if (typeof msg === 'string') {
            const messageNode = document.createElement('div');
            messageNode.textContent = msg;
            return messageNode;
        }
        return msg;
    }
}

@injectable()
export class CheWorkspaceController {

    @inject(CheApiService) protected readonly cheApi: CheApiService;
    @inject(QuickOpenCheWorkspace) protected readonly quickOpenWorkspace: QuickOpenCheWorkspace;
    @inject(QuickOpenWorkspace) protected readonly quickOpenRecentWorkspaceRoots: QuickOpenWorkspace;
    @inject(WorkspaceService) protected readonly workspaceService: WorkspaceService;
    @inject(FileDialogService) protected readonly fileDialogService: FileDialogService;
    @inject(FileService) protected readonly fileService: FileService;
    @inject(WorkspacePreferences) protected preferences: WorkspacePreferences;
    @inject(DefaultUriLabelProviderContribution) protected uriLabelProvider: DefaultUriLabelProviderContribution;

    DEFAULT_FILE_FILTER: FileDialogTreeFilters = {
        'Theia Workspace (*.theia-workspace)': [THEIA_EXT],
        'VS Code Workspace (*.code-workspace)': [VSCODE_EXT]
    };

    DEVFILE_FILE_FILTER: FileDialogTreeFilters = {
        'Che Workspace (devfile)': ['devfile.yaml']
    };

    async openWorkspace(): Promise<void> {
        await this.doOpenWorkspace(false);
    }

    async openRecentWorkspace(): Promise<void> {
        await this.doOpenWorkspace(true);
    }

    private doOpenWorkspace(recent: boolean): Promise<void> {
        return this.quickOpenWorkspace.select(recent, async (workspace: che.workspace.Workspace) => {
            const dialog = new StopWorkspaceDialog();
            const result = await dialog.open();
            if (typeof result === 'boolean') {
                if (result) {
                    await this.cheApi.stop();
                }
                window.parent.postMessage(`open-workspace:${workspace.id}`, '*');
            }
        });
    }

    async closeCurrentWorkspace(): Promise<void> {
        const dialog = new ConfirmDialog({
            title: CheWorkspaceCommands.CLOSE_CURRENT_WORKSPACE.label!,
            msg: 'Do you really want to close the workspace?'
        });
        if (await dialog.open()) {
            await this.cheApi.stop();

            window.parent.postMessage('show-workspaces', '*');
        }
    }

    async closeWorkspaceRoots(): Promise<void> {
        const dialog = new ConfirmDialog({
            title: CheWorkspaceCommands.CLOSE_WORKSPACE_ROOTS.label!,
            msg: 'Do you really want to close the workspace roots?'
        });
        if (await dialog.open()) {
            await this.workspaceService.close();
        }
    }

    openRecentWorkspaceRoots(): void {
        this.quickOpenRecentWorkspaceRoots.select();
    }

    async openWorkspaceRoots(): Promise<URI | undefined> {
        const props = await this.openWorkspaceOpenFileDialogProps();
        const [rootStat] = await this.workspaceService.roots;
        const workspaceFolderOrWorkspaceFileUri = await this.fileDialogService.showOpenDialog(props, rootStat);
        if (workspaceFolderOrWorkspaceFileUri &&
            this.getCurrentWorkspaceUri().toString() !== workspaceFolderOrWorkspaceFileUri.toString()) {
            const destinationFolder = await this.fileService.resolve(workspaceFolderOrWorkspaceFileUri);
            if (destinationFolder) {
                this.workspaceService.open(workspaceFolderOrWorkspaceFileUri);
                return workspaceFolderOrWorkspaceFileUri;
            }
        }
        return undefined;
    }

    private async openWorkspaceOpenFileDialogProps(): Promise<OpenFileDialogProps> {
        await this.preferences.ready;
        const supportMultiRootWorkspace = this.preferences['workspace.supportMultiRootWorkspace'];
        return this.createOpenWorkspaceOpenFileDialogProps({
            supportMultiRootWorkspace
        });
    }

    private getCurrentWorkspaceUri(): URI {
        return new URI(this.workspaceService.workspace && this.workspaceService.workspace.resource.toString());
    }

    private createOpenWorkspaceOpenFileDialogProps(options: Readonly<{ supportMultiRootWorkspace: boolean }>): OpenFileDialogProps {
        const title = CheWorkspaceCommands.OPEN_WORKSPACE_ROOTS.dialogLabel;
        if (options.supportMultiRootWorkspace) {
            return {
                title,
                canSelectFiles: true,
                canSelectFolders: true,
                filters: {
                    'Theia Workspace (*.theia-workspace)': [THEIA_EXT],
                    'VS Code Workspace (*.code-workspace)': [VSCODE_EXT]
                }
            };
        } else {
            // otherwise, it is always folders. No files at all.
            return {
                title,
                canSelectFiles: false,
                canSelectFolders: true
            };
        }
    }

    async saveWorkspaceRootsAs(): Promise<void> {
        let exist: boolean = false;
        let overwrite: boolean = false;
        let selected: URI | undefined;
        do {
            selected = await this.fileDialogService.showSaveDialog({
                title: CheWorkspaceCommands.SAVE_WORKSPACE_AS.label!,
                filters: this.DEFAULT_FILE_FILTER
            });
            if (selected) {
                const displayName = this.uriLabelProvider.getName(selected);
                if (displayName && !displayName.endsWith(`.${THEIA_EXT}`) && !displayName.endsWith(`.${VSCODE_EXT}`)) {
                    selected = selected.parent.resolve(`${displayName}.${THEIA_EXT}`);
                }
                exist = await this.fileService.exists(selected);
                if (exist) {
                    overwrite = await this.confirmOverwrite(selected);
                }
            }
        } while (selected && exist && !overwrite);

        if (selected) {
            await this.workspaceService.save(selected);
        }
    }

    private async confirmOverwrite(uri: URI): Promise<boolean> {
        const confirmed = await new ConfirmDialog({
            title: 'Overwrite',
            msg: `Do you really want to overwrite "${uri.toString()}"?`
        }).open();
        return !!confirmed;
    }

    async saveWorkspaceAs(): Promise<void> {
        let exist: boolean = false;
        let overwrite: boolean = false;
        let selected: URI | undefined;
        do {
            selected = await this.fileDialogService.showSaveDialog({
                title: CheWorkspaceCommands.SAVE_WORKSPACE_AS.label!,
                filters: this.DEVFILE_FILE_FILTER,
                inputValue: 'devfile.yaml'
            });
            if (selected) {
                exist = await this.fileService.exists(selected);
                if (exist) {
                    overwrite = await this.confirmOverwrite(selected);
                }
            }
        } while (selected && exist && !overwrite);

        if (selected) {
            const workspace = await this.cheApi.currentWorkspace();
            if (!workspace.devfile) {
                return;
            }

            const devfileContent = YAML.safeDump(workspace.devfile);
            await this.writeDevfileFile(selected, devfileContent);
        }
    }

    private async writeDevfileFile(uri: URI, devfile: string): Promise<void> {
        if (!await this.fileService.exists(uri)) {
            await this.fileService.createFile(uri);
        }

        const devfileStat = await this.toFileStat(uri.toString());
        if (devfileStat) {
            await this.fileService.write(devfileStat.resource, devfile);
        }
    }

    private async toFileStat(uri: URI | string | undefined): Promise<FileStat | undefined> {
        if (!uri) {
            return undefined;
        }
        let uriStr = uri.toString();
        try {
            if (uriStr.endsWith('/')) {
                uriStr = uriStr.slice(0, -1);
            }
            const normalizedUri = new URI(uriStr).normalizePath();
            const fileStat = await this.fileService.resolve(normalizedUri);
            if (!fileStat) {
                return undefined;
            }
            return fileStat;
        } catch (error) {
            return undefined;
        }
    }
}
