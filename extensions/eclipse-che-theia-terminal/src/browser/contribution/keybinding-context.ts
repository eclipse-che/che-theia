/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { RemoteTerminalWidget } from '../terminal-widget/remote-terminal-widget';
import { TerminalActiveContext } from '@theia/terminal/lib/browser/terminal-keybinding-contexts';
import { injectable } from 'inversify';

export namespace TerminalKeybindingContext {
  export const contextId = 'TerminalInSpecificContainerContext';
}

@injectable()
export class RemoteTerminaActiveKeybingContext extends TerminalActiveContext {
  readonly id: string = TerminalKeybindingContext.contextId;

  isEnabled(): boolean {
    return this.shell.activeWidget instanceof RemoteTerminalWidget;
  }
}
