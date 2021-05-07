/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import 'reflect-metadata';

import * as che from '@eclipse-che/plugin';
import * as theia from '@theia/plugin';

import { InversifyBinding } from './inversify-binding';
import { ResourceMonitor } from './resource-monitor';

let resourceMonitorPLugin: ResourceMonitor;

export async function start(context: theia.PluginContext): Promise<void> {
  const inversifyBinding = new InversifyBinding();
  const container = await inversifyBinding.initBindings();
  const namespace = await getNamespace();
  resourceMonitorPLugin = container.get(ResourceMonitor);
  resourceMonitorPLugin.start(context, namespace);
}

export async function getNamespace(): Promise<string> {
  // get namespace from devfile service
  const devfile = await che.devfile.get();
  return devfile.metadata?.attributes ? devfile.metadata.attributes.infrastructureNamespace : '';
}
