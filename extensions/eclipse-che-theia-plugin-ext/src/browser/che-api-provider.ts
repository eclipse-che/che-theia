/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { MainPluginApiProvider } from '@theia/plugin-ext/lib/common/plugin-ext-api-contribution';
import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { injectable, interfaces } from 'inversify';
import { PLUGIN_RPC_CONTEXT } from '../common/che-protocol';
import { CheWorkspaceMainImpl } from './che-workspace-main';
import { CheFactoryMainImpl } from './che-factory-main';
import { CheTelemetryMainImpl } from './che-telemetry-main';
import { CheVariablesMainImpl } from './che-variables-main';
import { CheTaskMainImpl } from './che-task-main';
import { CheSshMainImpl } from './che-ssh-main';
import { CheDevfileMainImpl } from './che-devfile-main';
import { CheUserMainImpl } from './che-user-main';
import { CheProductMainImpl } from './che-product-main';
import { CheSideCarContentReaderMainImpl } from './che-sidecar-content-reader-main';
import { CheGithubMainImpl } from './che-github-main';
import { CheOpenshiftMainImpl } from './che-openshift-main';
import { CheOauthMainImpl } from './che-oauth-main';

@injectable()
export class CheApiProvider implements MainPluginApiProvider {

    initialize(rpc: RPCProtocol, container: interfaces.Container): void {
        rpc.set(PLUGIN_RPC_CONTEXT.CHE_WORKSPACE_MAIN, new CheWorkspaceMainImpl(container));
        rpc.set(PLUGIN_RPC_CONTEXT.CHE_FACTORY_MAIN, new CheFactoryMainImpl(container));
        rpc.set(PLUGIN_RPC_CONTEXT.CHE_DEVFILE_MAIN, new CheDevfileMainImpl(container));
        rpc.set(PLUGIN_RPC_CONTEXT.CHE_TELEMETRY_MAIN, new CheTelemetryMainImpl(container, rpc));
        rpc.set(PLUGIN_RPC_CONTEXT.CHE_VARIABLES_MAIN, new CheVariablesMainImpl(container, rpc));
        rpc.set(PLUGIN_RPC_CONTEXT.CHE_TASK_MAIN, new CheTaskMainImpl(container, rpc));
        rpc.set(PLUGIN_RPC_CONTEXT.CHE_SSH_MAIN, new CheSshMainImpl(container));
        rpc.set(PLUGIN_RPC_CONTEXT.CHE_GITHUB_MAIN, new CheGithubMainImpl(container));
        rpc.set(PLUGIN_RPC_CONTEXT.CHE_OPENSHIFT_MAIN, new CheOpenshiftMainImpl(container));
        rpc.set(PLUGIN_RPC_CONTEXT.CHE_OAUTH_MAIN, new CheOauthMainImpl(container));
        rpc.set(PLUGIN_RPC_CONTEXT.CHE_USER_MAIN, new CheUserMainImpl(container));
        rpc.set(PLUGIN_RPC_CONTEXT.CHE_PRODUCT_MAIN, new CheProductMainImpl(container, rpc));
        rpc.set(PLUGIN_RPC_CONTEXT.CHE_SIDERCAR_CONTENT_READER_MAIN, new CheSideCarContentReaderMainImpl(container, rpc));
    }

}
