/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { RPCProtocol } from '@theia/plugin-ext/lib/api/rpc-protocol';
import { PLUGIN_RPC_CONTEXT, CheApiMain, FactoryActionDto as CheFactoryAction, FactoryDto as CheFactory, ProjectConfigDto } from '../common/che-protocol';
import * as che from '@eclipse-che/plugin';

export class CheApiPluginImpl {

    private readonly delegate: CheApiMain;

    constructor(rpc: RPCProtocol) {
        this.delegate = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_API_MAIN);
    }

    getSettings(): Promise<che.WorkspaceSettings> {
        throw new Error('Method not implemented.');
    }
    stop(workspaceId: string): Promise<any> {
        throw new Error('Method not implemented.');
    }
    startTemporary(config: che.WorkspaceConfig): Promise<any> {
        throw new Error('Method not implemented.');
    }
    start(workspaceId: string, environmentName: string): Promise<any> {
        throw new Error('Method not implemented.');
    }
    deleteWorkspace(workspaceId: string): Promise<any> {
        throw new Error('Method not implemented.');
    }
    update(workspaceId: string, workspace: che.Workspace): Promise<any> {
        throw new Error('Method not implemented.');
    }
    create(config: che.WorkspaceConfig, params: che.ResourceCreateQueryParams): Promise<any> {
        throw new Error('Method not implemented.');
    }
    getById(workspaceKey: string): Promise<che.Workspace> {
        throw new Error('Method not implemented.');
    }
    getAllByNamespace(namespace: string): Promise<che.Workspace[]> {
        throw new Error('Method not implemented.');
    }
    getAll(): Promise<che.Workspace[]> {
        throw new Error('Method not implemented.');
    }

    getCurrentWorkspace(): Promise<che.Workspace> {
        return this.delegate.$currentWorkspace();
    }

    async getFactory(factoryId: string): Promise<che.MYFactory> {
        try {
            const myFactory = await this.delegate.$getFactoryById(factoryId + 'oo');
            console.log('> got factory ', myFactory);
            return myFactory;
        } catch (e) {
            return Promise.reject(e);
        }
        // return .then(f => new FactoryImpl(f));
    }

}

class FactoryImpl implements che.Factory {

    constructor(private readonly factory: CheFactory) { }

    getProjects(): che.FactoryProject[] {
        if (!this.factory || !this.factory.workspace || !this.factory.workspace.projects) {
            return [];
        }

        return this.factory.workspace.projects.map((project: ProjectConfigDto) => new ProjectImpl(project));
    }
    getOnProjectsImportedActions(): che.FactoryAction[] {
        if (!this.factory || !this.factory.ide || !this.factory.ide.onProjectsLoaded || !this.factory.ide.onProjectsLoaded.actions) {
            return [];
        }

        return this.factory.ide.onProjectsLoaded.actions.map((action: CheFactoryAction) => new FactoryActionImpl(action.id, action.properties));
    }

    getOnAppLoadedActions(): che.FactoryAction[] {
        if (!this.factory || !this.factory.ide || !this.factory.ide.onAppLoaded || !this.factory.ide.onAppLoaded.actions) {
            return [];
        }

        return this.factory.ide.onAppLoaded.actions.map((action: CheFactoryAction) => new FactoryActionImpl(action.id, action.properties));;
    }

    getOnAppClosedActions(): che.FactoryAction[] {
        if (!this.factory || !this.factory.ide || !this.factory.ide.onAppClosed || !this.factory.ide.onAppClosed.actions) {
            return [];
        }
        return this.factory.ide.onAppClosed.actions.map((action: CheFactoryAction) => new FactoryActionImpl(action.id, action.properties));;
    }

}

class ProjectImpl implements che.FactoryProject {

    constructor(private readonly project: ProjectConfigDto) {
    }

    getPath(): string {
        return this.project.path;
    }

    getLocationURI(): string | undefined {
        if (!this.project.source || !this.project.source.location) {
            return undefined;
        }
        return this.project.source.location;
    }

    getCheckoutBranch(): string | undefined {
        if (!this.project.source || !this.project.source.parameters['branch']) {
            return undefined;
        }
        return this.project.source.parameters['branch'];
    }

}

class FactoryActionImpl implements che.FactoryAction {

    constructor(
        private readonly id: string,
        private readonly properties: che.FactoryActionProperties | undefined
    ) {
    }

    getId(): string {
        return this.id;
    }

    getProperties(): che.FactoryActionProperties | undefined {
        return this.properties;
    }
}
