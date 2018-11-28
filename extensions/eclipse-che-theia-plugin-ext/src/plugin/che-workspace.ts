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
import { PLUGIN_RPC_CONTEXT, CheApiMain, FactoryAction as CheFactoryAction, Factory as CheFactory, ProjectConfig } from '../common/che-protocol';
import { WorkspaceSettings, WorkspaceConfig, Workspace, ResourceCreateQueryParams, Factory, Project, FactoryAction, FactoryActionProperties } from '@eclipse-che/plugin';

export class CheApiPluginImpl {

    private readonly delegate: CheApiMain;

    constructor(rpc: RPCProtocol) {
        this.delegate = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_API_MAIN);
    }

    getSettings(): Promise<WorkspaceSettings> {
        throw new Error('Method not implemented.');
    }
    stop(workspaceId: string): Promise<any> {
        throw new Error('Method not implemented.');
    }
    startTemporary(config: WorkspaceConfig): Promise<any> {
        throw new Error('Method not implemented.');
    }
    start(workspaceId: string, environmentName: string): Promise<any> {
        throw new Error('Method not implemented.');
    }
    deleteWorkspace(workspaceId: string): Promise<any> {
        throw new Error('Method not implemented.');
    }
    update(workspaceId: string, workspace: Workspace): Promise<any> {
        throw new Error('Method not implemented.');
    }
    create(config: WorkspaceConfig, params: ResourceCreateQueryParams): Promise<any> {
        throw new Error('Method not implemented.');
    }
    getById(workspaceKey: string): Promise<Workspace> {
        throw new Error('Method not implemented.');
    }
    getAllByNamespace(namespace: string): Promise<Workspace[]> {
        throw new Error('Method not implemented.');
    }
    getAll(): Promise<Workspace[]> {
        throw new Error('Method not implemented.');
    }
    getCurrentWorkspace(): Promise<Workspace> {
        return this.delegate.$currentWorkspace();
    }

    getFactoryById(id: string): Promise<Factory> {
        return this.delegate.$getFactoryById(id).then(f => new FactoryImpl(f));
    }
}

class FactoryImpl implements Factory {

    constructor(private readonly factory: CheFactory) { }

    getProjects(): Project[] {
        if (!this.factory || !this.factory.workspace || !this.factory.workspace.projects) {
            return [];
        }

        return this.factory.workspace.projects.map((project: ProjectConfig) => new ProjectImpl(project));
    }
    getOnProjectsImportedActions(): FactoryAction[] {
        if (!this.factory || !this.factory.ide || !this.factory.ide.onProjectsLoaded || !this.factory.ide.onProjectsLoaded.actions) {
            return [];
        }

        return this.factory.ide.onProjectsLoaded.actions.map((action: CheFactoryAction) => new FactoryActionImpl(action.id, action.properties));
    }

    getFactoryOnAppLoadedActions(): FactoryAction[] {
        if (!this.factory || !this.factory.ide || !this.factory.ide.onAppLoaded || !this.factory.ide.onAppLoaded.actions) {
            return [];
        }

        return this.factory.ide.onAppLoaded.actions.map((action: CheFactoryAction) => new FactoryActionImpl(action.id, action.properties));;
    }

    getFactoryOnAppClosedActions(): FactoryAction[] {
        if (!this.factory || !this.factory.ide || !this.factory.ide.onAppClosed || !this.factory.ide.onAppClosed.actions) {
            return [];
        }
        return this.factory.ide.onAppClosed.actions.map((action: CheFactoryAction) => new FactoryActionImpl(action.id, action.properties));;
    }

}

class ProjectImpl implements Project {

    constructor(private readonly project: ProjectConfig) {
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

class FactoryActionImpl implements FactoryAction {

    constructor(
        private readonly id: string,
        private readonly properties: FactoryActionProperties | undefined
    ) {
    }

    getId(): string {
        return this.id;
    }

    getProperties(): FactoryActionProperties | undefined {
        return this.properties;
    }
}
