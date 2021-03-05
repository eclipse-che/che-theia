/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { PluginModel, SSHPlugin } from './ssh-plugin';

import { InversifyBinding } from './inversify-bindings';

export async function start(): Promise<PluginModel> {
  const container = new InversifyBinding().init();
  const sshPlugin = container.get(SSHPlugin);
  return sshPlugin.start();
}

export function stop(): void {}
