/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import {
  CONNECT_TERMINAL_SEGMENT,
  RemoteTerminalServer,
  RemoteTerminalServerProxy,
  RemoteTerminalWatcher,
} from './remote-terminal-protocol';
import { inject, injectable } from 'inversify';

import { RemoteWebSocketConnectionProvider } from './remote-connection';
import URI from '@theia/core/lib/common/uri';

export type TerminalApiEndPointProvider = () => Promise<URI | undefined>;

export type TerminalProxyCreatorProvider = () => Promise<TerminalProxyCreator>;

@injectable()
export class TerminalProxyCreator {
  private remoteTermServer: RemoteTerminalServerProxy;

  constructor(
    @inject(RemoteWebSocketConnectionProvider) protected readonly connProvider: RemoteWebSocketConnectionProvider,
    @inject('term-api-end-point') protected readonly apiEndPoint: URI | undefined,
    @inject(RemoteTerminalWatcher) protected readonly terminalWatcher: RemoteTerminalWatcher
  ) {}

  create(): RemoteTerminalServerProxy {
    if (!this.remoteTermServer && this.apiEndPoint) {
      const url = this.apiEndPoint.resolve(CONNECT_TERMINAL_SEGMENT);
      this.remoteTermServer = this.connProvider.createProxy<RemoteTerminalServer>(
        url.toString(true),
        this.terminalWatcher.getTerminalExecClient()
      );
    }
    return this.remoteTermServer;
  }
}
