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

import { Container } from 'inversify';
import { K8sHelper } from './k8s-helper';
import { ResourceMonitor } from './resource-monitor';

export class InversifyBinding {
  private container: Container;

  constructor() {}

  public async initBindings(): Promise<Container> {
    this.container = new Container();

    this.container.bind(K8sHelper).toSelf().inSingletonScope();
    this.container.bind(ResourceMonitor).toSelf().inSingletonScope();

    return this.container;
  }
}
