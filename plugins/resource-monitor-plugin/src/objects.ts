/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

export interface Container {
  name: string;
  cpuLimit?: number;
  memoryLimit?: number;
  cpuUsed?: number;
  memoryUsed?: number;
}

export interface Resource {
  cpu: string;
  memory: string;
}

export interface Metrics {
  containers: MetricContainer[];
}

export interface MetricContainer {
  name: string;
  usage: Resource;
}
