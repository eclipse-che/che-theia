/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

export const cheDevfileServicePath = '/services/che-devfile-service';

export const DevfileService = Symbol('DevfileService');

export interface DevfileComponentStatus {
  name: string;
  isUser: boolean;
  endpoints?: {
    [endpointName: string]: {
      url?: string;
    };
  };
}
export interface DevfileMetadata {
  attributes?: { [attributeName: string]: string };
  description?: string;
  displayName?: string;
  globalMemoryLimit?: string;
  icon?: string;
  name?: string;
  tags?: string[];
  version?: string;
}

export interface Devfile {
  apiVersion: string;
  attributes?: { [attributeName: string]: string };
  metadata: DevfileMetadata;
  projects?: DevfileProject[];
  components?: DevfileComponent[];
  commands?: DevfileCommand[];
}
export interface DevfileCommandGroup {
  isDefault?: boolean;
  kind: 'build' | 'run' | 'test' | 'debug';
}

export interface DevfileCommand {
  apply?: {
    component: string;
    group?: DevfileCommandGroup;
    label?: string;
  };
  composite?: {
    commands: string[];
    group?: DevfileCommandGroup;
    label?: string;
    parallel?: boolean;
  };
  exec?: {
    commandLine?: string;
    component: string;
    env?: DevfileComponentEnv[];
    group?: DevfileCommandGroup;
    hotReloadCapable?: boolean;
    label?: string;
    workingDir?: string;
  };
  vscodeLaunch?: {
    inline?: string;
    uri?: string;
    group?: DevfileCommandGroup;
  };
  vscodeTask?: {
    inline?: string;
    uri?: string;
    group?: DevfileCommandGroup;
  };
  attributes?: { [attributeName: string]: string };
  id: string;
}

export interface DevfileComponentVolumeMount {
  name?: string;
  path?: string;
}

export interface DevfileComponentEnv {
  name: string;
  value: string;
}

export interface DevfileComponentEndpoint {
  attributes?: { [attributeName: string]: string };
  exposure?: 'public' | 'internal' | 'none';
  name: string;
  path?: string;
  protocol?: 'http' | 'https' | 'ws' | 'wss' | 'tcp' | 'udp';
  secure?: boolean;
  targetPort: number;
}

export interface DevfileKubernetesComponent {
  inlined?: string;
  uri?: string;
  endpoints?: DevfileComponentEndpoint[];
}

export interface DevfileKubernetesComponent {
  inlined?: string;
  uri?: string;
  endpoints?: DevfileComponentEndpoint[];
}

export interface DevfileContainerComponent {
  args?: string[];
  command?: string[];
  cpuLimit?: string;
  cpuRequest?: string;
  dedicatedPod?: boolean;
  endpoints?: DevfileComponentEndpoint[];
  env?: DevfileComponentEnv[];
  image: string;
  memoryLimit?: string;
  memoryRequest?: string;
  mountSources?: boolean;
  sourceMapping?: string;
  volumeMounts?: DevfileComponentVolumeMount[];
}

export interface DevfileV1PluginComponent {
  id?: string;
  url?: string;
  registryUrl?: string;
  cpuLimit?: string;
  cpuRequest?: string;
  endpoints?: DevfileComponentEndpoint[];
  env?: DevfileComponentEnv[];
  memoryLimit?: string;
  memoryRequest?: string;
  mountSources?: boolean;
  sourceMapping?: string;
  volumeMounts?: DevfileComponentVolumeMount[];
  preferences?: { [preferenceName: string]: unknown };
}
export interface DevfileComponent {
  name?: string;
  container?: DevfileContainerComponent;
  kubernetes?: DevfileKubernetesComponent;
  openshift?: DevfileKubernetesComponent;
  plugin?: DevfileV1PluginComponent;
  attributes?: { [attributeName: string]: string };
  volume?: {
    size?: string;
  };
}

export interface DevfileProjectInfo {
  checkoutFrom?: {
    remote?: string;
    revision?: string;
  };
  remotes: { [remoteName: string]: string };
}
export interface DevfileProject {
  name: string;
  attributes?: { [attributeName: string]: string };
  clonePath?: string;
  git?: DevfileProjectInfo;
  github?: DevfileProjectInfo;
  zip?: {
    location: string;
  };
  sparseCheckoutDirs?: string[];
}

export interface DevfileService {
  // Provides raw content of the devfile as a string
  getRaw(): Promise<string>;
  // Get structured object of the devfile
  get(): Promise<Devfile>;
  getComponentStatuses(): Promise<DevfileComponentStatus[]>;

  // Update the devfile based on the given content
  updateDevfile(devfile: Devfile): Promise<void>;
}
