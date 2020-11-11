/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { CheGitClient, GitConfigChanged } from '../common/git-protocol';
import { Emitter, Event } from '@theia/core';

import { injectable } from 'inversify';

@injectable()
export class CheGitClientImpl implements CheGitClient {
  private onChangedEmitter = new Emitter<GitConfigChanged>();

  get changeEvent(): Event<GitConfigChanged> {
    return this.onChangedEmitter.event;
  }
  firePreferencesChanged(): void {
    const event: GitConfigChanged = {};
    this.onChangedEmitter.fire(event);
  }
}
