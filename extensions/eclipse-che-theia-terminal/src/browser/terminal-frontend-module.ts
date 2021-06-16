/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { Container, ContainerModule, interfaces } from 'inversify';
import {
  ExecTerminalFrontendContribution,
  NewTerminalInSpecificContainer,
} from './contribution/exec-terminal-contribution';
import { KeybindingContext, QuickOpenContribution, WidgetFactory } from '@theia/core/lib/browser';
import {
  REMOTE_TERMINAL_TARGET_SCOPE,
  REMOTE_TERMINAL_WIDGET_FACTORY_ID,
  RemoteTerminalWidgetOptions,
} from './terminal-widget/remote-terminal-widget';
import {
  RemoteTerminalServer,
  RemoteTerminalServerProxy,
  RemoteTerminalWatcher,
} from './server-definition/remote-terminal-protocol';
import {
  TerminalApiEndPointProvider,
  TerminalProxyCreator,
  TerminalProxyCreatorProvider,
} from './server-definition/terminal-proxy-creator';
import { TerminalWidget, TerminalWidgetOptions } from '@theia/terminal/lib/browser/base/terminal-widget';

import { EndpointService } from '@eclipse-che/theia-remote-api/lib/common/endpoint-service';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import { RemoteTerminaActiveKeybingContext } from './contribution/keybinding-context';
import { RemoteTerminalWidget } from './terminal-widget/remote-terminal-widget';
import { RemoteWebSocketConnectionProvider } from './server-definition/remote-connection';
import { TerminalFrontendContribution } from '@theia/terminal/lib/browser/terminal-frontend-contribution';
import { TerminalQuickOpenService } from './contribution/terminal-quick-open';
import { TerminalSearchWidgetFactory } from '@theia/terminal/lib/browser/search/terminal-search-widget';
import { TerminalService } from '@theia/terminal/lib/browser/base/terminal-service';
import { TerminalWidgetImpl } from '@theia/terminal/lib/browser/terminal-widget-impl';
import URI from '@theia/core/lib/common/uri';
import { createTerminalSearchFactory } from '@theia/terminal/lib/browser/search/terminal-search-container';

export default new ContainerModule(
  (bind: interfaces.Bind, unbind: interfaces.Unbind, isBound: interfaces.IsBound, rebind: interfaces.Rebind) => {
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
          ...options,
        };
        child.bind(TerminalWidgetOptions).toConstantValue(widgetOptions);
        child.bind(RemoteTerminalWidgetOptions).toConstantValue(widgetOptions);
        child.bind('terminal-dom-id').toConstantValue(domId);

        child
          .bind(TerminalSearchWidgetFactory)
          .toDynamicValue(context => createTerminalSearchFactory(context.container));

        return child.getNamed(TerminalWidget, REMOTE_TERMINAL_TARGET_SCOPE);
      },
    }));

    let terminalApiEndPoint: URI | undefined = undefined;
    bind<TerminalApiEndPointProvider>('TerminalApiEndPointProvider').toProvider<URI | undefined>(
      context => async () => {
        if (terminalApiEndPoint) {
          return terminalApiEndPoint;
        }

        const endpointService = context.container.get<EndpointService>(EndpointService);
        const envServer = context.container.get<EnvVariablesServer>(EnvVariablesServer);
        const terminalComponents = await endpointService.getEndpointsByType('collocated-terminal');
        if (terminalComponents.length !== 1) {
          console.error(
            'Failed to get remote terminal server api end point url. Cause: Found ${terminalComponents} components (should only have one)'
          );
          return undefined;
        }
        const terminalComponent = terminalComponents[0];
        rebind(TerminalWidget).to(TerminalWidgetImpl).inTransientScope().whenTargetIsDefault();
        bind(TerminalWidget).to(RemoteTerminalWidget).inTransientScope().whenTargetNamed(REMOTE_TERMINAL_TARGET_SCOPE);

        rebind(TerminalService).toService(ExecTerminalFrontendContribution);

        const token = await envServer.getValue('CHE_MACHINE_TOKEN');
        let uri = new URI(terminalComponent.url);
        if (token && token.value) {
          uri = uri.withQuery('token=' + token.value);
        }
        terminalApiEndPoint = uri;
        return uri;
      }
    );

    bind<TerminalProxyCreatorProvider>('TerminalProxyCreatorProvider').toProvider<TerminalProxyCreator>(
      context => () =>
        new Promise<TerminalProxyCreator>((resolve, reject) => {
          const provider = context.container.get<TerminalApiEndPointProvider>('TerminalApiEndPointProvider');
          provider()
            .then(url => {
              if (url) {
                context.container.bind('term-api-end-point').toConstantValue(url);
                return resolve(context.container.get(TerminalProxyCreator));
              }
              return reject('Unabel to find che-machine-exec server.');
            })
            .catch(err => {
              console.log('Failed to get terminal proxy. Cause: ', err);
              return reject(err);
            });
        })
    );
  }
);
