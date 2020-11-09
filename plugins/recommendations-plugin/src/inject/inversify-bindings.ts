/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/
import { Container } from 'inversify';
import { analyzerModule } from '../analyzer/analyzer-module';
import { devfileModule } from '../devfile/devfile-module';
import { featuredModule } from '../strategy/featured-module';
import { fetchModule } from '../fetch/fetch-module';
import { findModule } from '../find/find-module';
import { pluginModule } from '../plugin/plugin-module';
import { registryModule } from '../registry/registry-module';
import { workspaceModule } from '../workspace/workspace-module';

export class InversifyBinding {
  private container: Container;

  public initBindings(): Container {
    this.container = new Container();

    this.container.load(analyzerModule);
    this.container.load(devfileModule);
    this.container.load(featuredModule);
    this.container.load(fetchModule);
    this.container.load(registryModule);
    this.container.load(findModule);
    this.container.load(pluginModule);
    this.container.load(workspaceModule);

    return this.container;
  }
}
