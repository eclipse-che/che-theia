/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { ContainerModule, Container, interfaces } from 'inversify';
import { WidgetFactory, WebSocketConnectionProvider, KeybindingContext, QuickOpenContribution } from '@theia/core/lib/browser';
import { TerminalQuickOpenService } from './contribution/terminal-quick-open';
import { RemoteTerminalWidgetOptions, REMOTE_TERMINAL_WIDGET_FACTORY_ID, REMOTE_TERMINAL_TARGET_SCOPE } from './terminal-widget/remote-terminal-widget';
import { RemoteWebSocketConnectionProvider } from './server-definition/remote-connection';
import { TerminalProxyCreator, TerminalProxyCreatorProvider, TerminalApiEndPointProvider } from './server-definition/terminal-proxy-creator';
import { cheWorkspaceServicePath, CHEWorkspaceService } from '../common/workspace-service';
import { ExecTerminalFrontendContribution, NewTerminalInSpecificContainer } from './contribution/exec-terminal-contribution';
import { TerminalFrontendContribution } from '@theia/terminal/lib/browser/terminal-frontend-contribution';
import { TerminalService } from '@theia/terminal/lib/browser/base/terminal-service';
import { TerminalWidget, TerminalWidgetOptions } from '@theia/terminal/lib/browser/base/terminal-widget';
import { RemoteTerminalWidget } from './terminal-widget/remote-terminal-widget';
import { RemoteTerminaActiveKeybingContext } from './contribution/keybinding-context';
import { RemoteTerminalServerProxy, RemoteTerminalServer, RemoteTerminalWatcher } from './server-definition/remote-terminal-protocol';
import URI from '@theia/core/lib/common/uri';
import { createTerminalSearchFactory } from '@theia/terminal/lib/browser/search/terminal-search-container';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import { TerminalWidgetImpl } from '@theia/terminal/lib/browser/terminal-widget-impl';
import { TerminalSearchWidgetFactory } from '@theia/terminal/lib/browser/search/terminal-search-widget';

export default new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind, isBound: interfaces.IsBound, rebind: interfaces.Rebind) => {
    // bind this contstant to prevent circle dependency
    bind('terminal-in-specific-container-command-id').toConstantValue(NewTerminalInSpecificContainer.id);

    bind(KeybindingContext).to(RemoteTerminaActiveKeybingContext).inSingletonScope();

    bind(RemoteTerminalWidget).toSelf();

    bind(TerminalQuickOpenService).toSelf().inSingletonScope();

    bind(ExecTerminalFrontendContribution).toSelf().inSingletonScope();

    rebind(TerminalFrontendContribution).toService(ExecTerminalFrontendContribution);
    bind(QuickOpenContribution).toService(ExecTerminalFrontendContribution);

    bind(RemoteWebSocketConnectionProvider).toSelf();
    bind(TerminalProxyCreator).toSelf().inSingletonScope();

    bind(RemoteTerminalServer).toService(RemoteTerminalServerProxy);

    bind(RemoteTerminalWatcher).toSelf().inSingletonScope();

    let terminalNum = 0;
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: REMOTE_TERMINAL_WIDGET_FACTORY_ID,
        createWidget: (options: RemoteTerminalWidgetOptions) => {
            const child = new Container({ defaultScope: 'Singleton' });
            child.parent = ctx.container;
            const counter = terminalNum++;
            const domId = options.id || 'terminal-' + counter;

            const widgetOptions: RemoteTerminalWidgetOptions = {
                title: options.machineName + ' terminal ' + counter,
                useServerTitle: true,
                destroyTermOnClose: true,
                ...options
            };
            child.bind(TerminalWidgetOptions).toConstantValue(widgetOptions);
            child.bind(RemoteTerminalWidgetOptions).toConstantValue(widgetOptions);
            child.bind('terminal-dom-id').toConstantValue(domId);

            child.bind(TerminalSearchWidgetFactory).toDynamicValue(context => createTerminalSearchFactory(context.container));

            return child.getNamed(TerminalWidget, REMOTE_TERMINAL_TARGET_SCOPE);
        }
    }));

    bind(CHEWorkspaceService).toDynamicValue(ctx => {
        const provider = ctx.container.get(WebSocketConnectionProvider);
        return provider.createProxy<CHEWorkspaceService>(cheWorkspaceServicePath);
    }).inSingletonScope();

    bind<TerminalApiEndPointProvider>('TerminalApiEndPointProvider').toProvider<URI | undefined>(context =>
        async () => {
            const workspaceService = context.container.get<CHEWorkspaceService>(CHEWorkspaceService);
            const envServer = context.container.get<EnvVariablesServer>(EnvVariablesServer);
            try {
                const server = await workspaceService.findTerminalServer();
                if (server) {
                    rebind(TerminalWidget).to(TerminalWidgetImpl).inTransientScope().whenTargetIsDefault();
                    bind(TerminalWidget).to(RemoteTerminalWidget).inTransientScope().whenTargetNamed(REMOTE_TERMINAL_TARGET_SCOPE);

                    rebind(TerminalService).toService(ExecTerminalFrontendContribution);

                    const token = await envServer.getValue('CHE_MACHINE_TOKEN');
                    let uri = new URI(server.url);
                    if (token && token.value) {
                        uri = uri.withQuery('token=' + token.value);
                    }
                    return uri;
                }
            } catch (err) {
                console.error('Failed to get remote terminal server api end point url. Cause: ', err);
            }
            return undefined;
        });

    bind<TerminalProxyCreatorProvider>('TerminalProxyCreatorProvider').toProvider<TerminalProxyCreator>(context =>
        () =>
            new Promise<TerminalProxyCreator>((resolve, reject) => {
                const provider = context.container.get<TerminalApiEndPointProvider>('TerminalApiEndPointProvider');
                provider().then(url => {
                    if (url) {
                        context.container.bind('term-api-end-point').toConstantValue(url);
                        return resolve(context.container.get(TerminalProxyCreator));
                    }
                    return reject('Unabel to find che-machine-exec server.');
                }).catch(err => {
                    console.log('Failed to get terminal proxy. Cause: ', err);
                    return reject(err);
                });
            }));
});
