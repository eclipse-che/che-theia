/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { injectable } from 'inversify';
import { Emitter, Event } from '@theia/core';
import { CheGitClient, GitConfigChanged } from '../common/git-protocol';

@injectable()
export class CheGitClientImpl implements CheGitClient {

    private onChangedEmitter = new Emitter<GitConfigChanged>();

    get changeEvent(): Event<GitConfigChanged> {
        return this.onChangedEmitter.event;
    }
    firePreferencesChanged() {
        const event: GitConfigChanged = {};
        this.onChangedEmitter.fire(event);
    }
}
