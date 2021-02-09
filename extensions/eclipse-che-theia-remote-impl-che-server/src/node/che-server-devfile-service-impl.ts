/**********************************************************************
 * Copyright (c) 2020-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as jsYaml from 'js-yaml';

import {
  Devfile,
  DevfileCommand,
  DevfileComponent,
  DevfileComponentEndpoint,
  DevfileComponentEnv,
  DevfileComponentStatus,
  DevfileComponentVolumeMount,
  DevfileMetadata,
  DevfileProject,
  DevfileProjectInfo,
  DevfileService,
} from '@eclipse-che/theia-remote-api/lib/common/devfile-service';
import { inject, injectable } from 'inversify';

import { WorkspaceService } from '@eclipse-che/theia-remote-api/lib/common/workspace-service';
import { che as cheApi } from '@eclipse-che/api';

@injectable()
export class CheServerDevfileServiceImpl implements DevfileService {
  @inject(WorkspaceService)
  private workspaceService: WorkspaceService;

  componentVolumeV1toComponentVolumeV2(
    componentVolumes?: cheApi.workspace.devfile.DevfileVolume[]
  ): DevfileComponentVolumeMount[] | undefined {
    if (componentVolumes) {
      return componentVolumes.map(volumeV1 => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const volume: any = {};
        if (volumeV1.name) {
          volume.name = volumeV1.name;
        }
        if (volumeV1.containerPath) {
          volume.path = volumeV1.containerPath;
        }
        return volume;
      });
    }
    return undefined;
  }

  componentVolumeV2toComponentVolumeV1(
    componentVolumes?: DevfileComponentVolumeMount[]
  ): cheApi.workspace.devfile.DevfileVolume[] | undefined {
    if (componentVolumes) {
      return componentVolumes.map(volumeV2 => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const volume: any = {};
        if (volumeV2.name) {
          volume.name = volumeV2.name;
        }
        if (volumeV2.path) {
          volume.containerPath = volumeV2.path;
        }
        return volume;
      });
    }
    return undefined;
  }

  componentEndpointV1toComponentEndpointV2(
    componentEndpoints?: cheApi.workspace.devfile.Endpoint[]
  ): DevfileComponentEndpoint[] | undefined {
    if (componentEndpoints) {
      return componentEndpoints.map(endpointV1 => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const endpoint: any = {};
        if (endpointV1.name) {
          endpoint.name = endpointV1.name;
        }
        if (endpointV1.port) {
          endpoint.targetPort = endpointV1.port;
        }
        if (endpointV1.attributes) {
          endpoint.attributes = endpointV1.attributes;
          if (endpointV1.attributes['public'] !== undefined && endpointV1.attributes['public'] === 'false') {
            endpoint.exposure = 'internal';
          }
        }

        return endpoint;
      });
    }
    return undefined;
  }

  componentEndpointV2toComponentEndpointV1(
    componentEndpoints?: DevfileComponentEndpoint[]
  ): cheApi.workspace.devfile.Endpoint[] | undefined {
    if (componentEndpoints) {
      return componentEndpoints.map(endpointV2 => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const endpoint: any = {};
        if (endpointV2.name) {
          endpoint.name = endpointV2.name;
        }
        if (endpointV2.targetPort) {
          endpoint.port = endpointV2.targetPort;
        }
        if (endpointV2.attributes) {
          endpoint.attributes = endpointV2.attributes;
        }
        if (endpoint.exposure === 'internal') {
          if (!endpoint.attributes) {
            endpoint.attributes = {};
          }
          endpoint.attributes['public'] = 'false';
        }
        return endpoint;
      });
    }
    return undefined;
  }

  componentEnvV1toComponentEnvV2(componentEnvs?: cheApi.workspace.devfile.Env[]): DevfileComponentEnv[] | undefined {
    if (componentEnvs) {
      return componentEnvs.map(envV1 => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const env: any = {};
        if (envV1.name !== undefined) {
          env.name = envV1.name;
        }
        if (envV1.value !== undefined) {
          env.value = envV1.value;
        }
        return env;
      });
    }
    return undefined;
  }

  componentEnvV2toComponentEnvV1(componentEnvs?: DevfileComponentEnv[]): cheApi.workspace.devfile.Env[] | undefined {
    if (componentEnvs) {
      return componentEnvs.map(envV2 => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const env: any = {};
        if (envV2.name !== undefined) {
          env.name = envV2.name;
        }
        if (envV2.value !== undefined) {
          env.value = envV2.value;
        }
        return env;
      });
    }
    return undefined;
  }

  componentV2toComponentV1(componentV2: DevfileComponent): cheApi.workspace.devfile.Component {
    const devfileV1Component: cheApi.workspace.devfile.Component = {};

    if (componentV2.plugin) {
      devfileV1Component.type = 'chePlugin';

      if (componentV2.plugin.memoryLimit) {
        devfileV1Component.memoryLimit = componentV2.plugin.memoryLimit;
      }
      if (componentV2.plugin.memoryRequest) {
        devfileV1Component.memoryRequest = componentV2.plugin.memoryRequest;
      }
      if (componentV2.plugin.cpuLimit) {
        devfileV1Component.cpuLimit = componentV2.plugin.cpuLimit;
      }
      if (componentV2.plugin.cpuRequest) {
        devfileV1Component.cpuRequest = componentV2.plugin.cpuRequest;
      }
      if (componentV2.name) {
        devfileV1Component.alias = componentV2.name;
      }

      if (componentV2.plugin.id) {
        devfileV1Component.id = componentV2.plugin.id;
      }
      if (componentV2.plugin.url) {
        devfileV1Component.reference = componentV2.plugin.url;
      }
      if (componentV2.plugin.mountSources) {
        devfileV1Component.mountSources = componentV2.plugin.mountSources;
      }
      if (componentV2.plugin.preferences) {
        devfileV1Component.preferences = componentV2.plugin.preferences;
      }
      if (componentV2.plugin.registryUrl) {
        devfileV1Component.registryUrl = componentV2.plugin.registryUrl;
      }
      devfileV1Component.env = this.componentEnvV2toComponentEnvV1(componentV2.plugin.env);
      devfileV1Component.volumes = this.componentVolumeV2toComponentVolumeV1(componentV2.plugin.volumeMounts);
      devfileV1Component.endpoints = this.componentEndpointV2toComponentEndpointV1(componentV2.plugin.endpoints);
    } else if (componentV2.container) {
      devfileV1Component.type = 'dockerimage';

      if (componentV2.container.memoryLimit) {
        devfileV1Component.memoryLimit = componentV2.container.memoryLimit;
      }
      if (componentV2.container.memoryRequest) {
        devfileV1Component.memoryRequest = componentV2.container.memoryRequest;
      }
      if (componentV2.container.cpuLimit) {
        devfileV1Component.cpuLimit = componentV2.container.cpuLimit;
      }
      if (componentV2.container.cpuRequest) {
        devfileV1Component.cpuRequest = componentV2.container.cpuRequest;
      }
      if (componentV2.name) {
        devfileV1Component.alias = componentV2.name;
      }

      if (componentV2.container.mountSources) {
        devfileV1Component.mountSources = componentV2.container.mountSources;
      }
      if (componentV2.container.args) {
        devfileV1Component.args = componentV2.container.args;
      }
      if (componentV2.container.command) {
        devfileV1Component.command = componentV2.container.command;
      }
      if (componentV2.container.image) {
        devfileV1Component.image = componentV2.container.image;
      }

      devfileV1Component.env = this.componentEnvV2toComponentEnvV1(componentV2.container.env);
      devfileV1Component.volumes = this.componentVolumeV2toComponentVolumeV1(componentV2.container.volumeMounts);
      devfileV1Component.endpoints = this.componentEndpointV2toComponentEndpointV1(componentV2.container.endpoints);
    }

    if (!devfileV1Component.env) {
      delete devfileV1Component.env;
    }
    if (!devfileV1Component.volumes) {
      delete devfileV1Component.volumes;
    }
    if (!devfileV1Component.endpoints) {
      delete devfileV1Component.endpoints;
    }

    return devfileV1Component;
  }

  componentV1toComponentV2(componentV1: cheApi.workspace.devfile.Component): DevfileComponent {
    const devfileV2Component: DevfileComponent = {};

    if (componentV1.alias) {
      devfileV2Component.name = componentV1.alias;
    }

    if (componentV1.type === 'dockerimage') {
      devfileV2Component.container = {
        image: componentV1.image || '',
      };
      if (componentV1.command) {
        devfileV2Component.container.command = componentV1.command;
      }
      if (componentV1.args) {
        devfileV2Component.container.args = componentV1.args;
      }
      if (componentV1.cpuLimit) {
        devfileV2Component.container.cpuLimit = componentV1.cpuLimit;
      }
      if (componentV1.cpuRequest) {
        devfileV2Component.container.cpuRequest = componentV1.cpuRequest;
      }
      if (componentV1.memoryLimit) {
        devfileV2Component.container.memoryLimit = componentV1.memoryLimit;
      }
      if (componentV1.memoryRequest) {
        devfileV2Component.container.memoryRequest = componentV1.memoryRequest;
      }
      if (componentV1.mountSources) {
        devfileV2Component.container.mountSources = componentV1.mountSources;
      }
      devfileV2Component.container.env = this.componentEnvV1toComponentEnvV2(componentV1.env);
      devfileV2Component.container.volumeMounts = this.componentVolumeV1toComponentVolumeV2(componentV1.volumes);
      devfileV2Component.container.endpoints = this.componentEndpointV1toComponentEndpointV2(componentV1.endpoints);
    } else if (componentV1.type === 'chePlugin') {
      devfileV2Component.plugin = {};
      if (componentV1.id) {
        devfileV2Component.plugin.id = componentV1.id;
      }
      if (componentV1.preferences) {
        devfileV2Component.plugin.preferences = componentV1.preferences;
      }
      if (componentV1.reference) {
        devfileV2Component.plugin.url = componentV1.reference;
      }
      if (componentV1.cpuLimit) {
        devfileV2Component.plugin.cpuLimit = componentV1.cpuLimit;
      }
      if (componentV1.cpuRequest) {
        devfileV2Component.plugin.cpuRequest = componentV1.cpuRequest;
      }
      if (componentV1.memoryLimit) {
        devfileV2Component.plugin.memoryLimit = componentV1.memoryLimit;
      }
      if (componentV1.memoryRequest) {
        devfileV2Component.plugin.memoryRequest = componentV1.memoryRequest;
      }
      devfileV2Component.plugin.env = this.componentEnvV1toComponentEnvV2(componentV1.env);
      devfileV2Component.plugin.volumeMounts = this.componentVolumeV1toComponentVolumeV2(componentV1.volumes);
      devfileV2Component.plugin.endpoints = this.componentEndpointV1toComponentEndpointV2(componentV1.endpoints);
    }

    return devfileV2Component;
  }

  commandV1toCommandV2(commandV1: cheApi.workspace.devfile.DevfileCommand): DevfileCommand {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const devfileV2Command: any = {};

    if (commandV1.name) {
      devfileV2Command.id = commandV1.name;
    }
    if (commandV1.actions && commandV1.actions[0].type === 'exec') {
      devfileV2Command.exec = {};
      const action = commandV1.actions[0];
      if (action.command) {
        devfileV2Command.exec.commandLine = action.command;
      }
      if (action.component) {
        devfileV2Command.exec.component = action.component;
      }
      if (action.workdir) {
        devfileV2Command.exec.workingDir = action.workdir;
      }
    } else if (commandV1.actions && commandV1.actions[0].type === 'vscode-launch') {
      devfileV2Command.vscodeLaunch = {};
      const vscodeLaunch = commandV1.actions[0];
      if (vscodeLaunch.referenceContent) {
        devfileV2Command.vscodeLaunch.inline = vscodeLaunch.referenceContent;
      }
    } else if (commandV1.actions && commandV1.actions[0].type === 'vscode-task') {
      devfileV2Command.vscodeTask = {};
      const vscodeTask = commandV1.actions[0];
      if (vscodeTask.referenceContent) {
        devfileV2Command.vscodeTask.inline = vscodeTask.referenceContent;
      }
    }
    return devfileV2Command;
  }

  commandV2toCommandV1(commandV2: DevfileCommand): cheApi.workspace.devfile.DevfileCommand {
    const devfileV1Command: cheApi.workspace.devfile.DevfileCommand = {};

    if (commandV2.id) {
      devfileV1Command.name = commandV2.id;
    }

    if (commandV2.exec) {
      const devfileAction: cheApi.workspace.devfile.DevfileAction = {};
      if (commandV2.exec.commandLine) {
        devfileAction.command = commandV2.exec.commandLine;
      }
      if (commandV2.exec.component) {
        devfileAction.component = commandV2.exec.component;
      }
      if (commandV2.exec.workingDir) {
        devfileAction.workdir = commandV2.exec.workingDir;
      }
      devfileAction.type = 'exec';
      devfileV1Command.actions = [devfileAction];
    } else if (commandV2.vscodeLaunch) {
      const devfileAction: cheApi.workspace.devfile.DevfileAction = {};
      if (commandV2.vscodeLaunch.inline) {
        devfileAction.referenceContent = commandV2.vscodeLaunch.inline;
      }
      devfileAction.type = 'vscode-launch';
      devfileV1Command.actions = [devfileAction];
    } else if (commandV2.vscodeTask) {
      const devfileAction: cheApi.workspace.devfile.DevfileAction = {};
      if (commandV2.vscodeTask.inline) {
        devfileAction.referenceContent = commandV2.vscodeTask.inline;
      }
      devfileAction.type = 'vscode-task';
      devfileV1Command.actions = [devfileAction];
    }
    return devfileV1Command;
  }

  projectV1toProjectV2(projectV1: cheApi.workspace.devfile.Project): DevfileProject {
    const devfileV2Project: DevfileProject = {
      attributes: {},
      name: projectV1.name || 'unknown',
    };
    if (projectV1.clonePath) {
      devfileV2Project.clonePath = projectV1.clonePath;
    }

    if (projectV1.source) {
      const source = projectV1.source;
      if (source.sparseCheckoutDir) {
        devfileV2Project.sparseCheckoutDirs = [source.sparseCheckoutDir];
      }
      if (source.type === 'git' || source.type === 'github') {
        const remotes = { origin: source.location || '' };
        devfileV2Project.git = {
          remotes,
        };
        let checkoutFromRevision;

        if (source.branch) {
          checkoutFromRevision = source.branch;
          devfileV2Project.attributes['source-origin'] = 'branch';
        } else if (source.commitId) {
          checkoutFromRevision = source.commitId;
          devfileV2Project.attributes['source-origin'] = 'commitId';
        } else if (source.startPoint) {
          checkoutFromRevision = source.startPoint;
          devfileV2Project.attributes['source-origin'] = 'startPoint';
        } else if (source.tag) {
          checkoutFromRevision = source.tag;
          devfileV2Project.attributes['source-origin'] = 'tag';
        }
        if (checkoutFromRevision) {
          devfileV2Project.git.checkoutFrom = {
            revision: checkoutFromRevision,
          };
        }
      } else if (source.type === 'zip') {
        devfileV2Project.zip = {
          location: source.location || '',
        };
      }
    }
    return devfileV2Project;
  }

  projectInfoToProjectSource(
    project: DevfileProject,
    projectInfo: DevfileProjectInfo
  ): cheApi.workspace.devfile.Source {
    const gitSource: cheApi.workspace.devfile.Source = {};

    if (projectInfo.checkoutFrom) {
      if (project.attributes['source-origin']) {
        const origin = project.attributes['source-origin'];
        delete project.attributes['source-origin'];
        if (origin === 'branch') {
          gitSource.branch = projectInfo.checkoutFrom.revision;
        }
        if (origin === 'commitId') {
          gitSource.commitId = projectInfo.checkoutFrom.revision;
        }
        if (origin === 'startPoint') {
          gitSource.startPoint = projectInfo.checkoutFrom.revision;
        }
        if (origin === 'tag') {
          gitSource.tag = projectInfo.checkoutFrom.revision;
        }
      } else {
        gitSource.startPoint = projectInfo.checkoutFrom.revision;
      }
    }
    const remoteKeys = Object.keys(projectInfo.remotes);
    gitSource.location = projectInfo.remotes[remoteKeys[0]];
    gitSource.type = 'git';
    return gitSource;
  }

  metadataV1toMetadataV2(metadataV1?: cheApi.workspace.devfile.Metadata): DevfileMetadata {
    const devfileMetadataV2: DevfileMetadata = {};
    if (metadataV1) {
      if (metadataV1.generateName) {
        devfileMetadataV2.name = metadataV1.generateName;
        if (!devfileMetadataV2.attributes) {
          devfileMetadataV2.attributes = {};
        }
        devfileMetadataV2.attributes['metadata-name-field'] = 'generateName';
      }
      if (metadataV1.name) {
        devfileMetadataV2.name = metadataV1.name;
        if (!devfileMetadataV2.attributes) {
          devfileMetadataV2.attributes = {};
        }
        devfileMetadataV2.attributes['metadata-name-field'] = 'name';
      }
    }
    return devfileMetadataV2;
  }

  metadataV2toMetadataV1(metadataV2?: DevfileMetadata): cheApi.workspace.devfile.Metadata {
    const devfileMetadataV1: cheApi.workspace.devfile.Metadata = {};
    if (metadataV2) {
      if (metadataV2.name) {
        const metaDataAttributes = metadataV2.attributes || {};
        const nameField = metaDataAttributes['metadata-name-field'];
        if (nameField === 'generateName') {
          devfileMetadataV1.generateName = metadataV2.name;
        } else if (nameField === 'name') {
          devfileMetadataV1.name = metadataV2.name;
        } else {
          devfileMetadataV1.generateName = metadataV2.name;
        }
        if (metadataV2.attributes) {
          delete metadataV2.attributes['metadata-name-field'];
        }
      }
    }
    return devfileMetadataV1;
  }

  projectV2toProjectV1(projectV2: DevfileProject): cheApi.workspace.devfile.Project {
    const devfileV1Project: cheApi.workspace.devfile.Project = {
      name: projectV2.name,
    };
    if (projectV2.clonePath) {
      devfileV1Project.clonePath = projectV2.clonePath;
    }

    if (projectV2.git) {
      devfileV1Project.source = this.projectInfoToProjectSource(projectV2, projectV2.git);
    } else if (projectV2.github) {
      devfileV1Project.source = this.projectInfoToProjectSource(projectV2, projectV2.github);
    } else if (projectV2.zip) {
      devfileV1Project.source = {
        type: 'zip',
        location: projectV2.zip.location,
      };
    }

    return devfileV1Project;
  }

  async getRaw(): Promise<string> {
    const workspace = await this.workspaceService.currentWorkspace();
    const devfile = workspace.devfile;
    const devfileContent = jsYaml.safeDump(devfile);
    return devfileContent;
  }

  devfileV1toDevfileV2(devfileV1: cheApi.workspace.devfile.Devfile): Devfile {
    const devfileV2: Devfile = {
      apiVersion: '2.0.0',
      metadata: this.metadataV1toMetadataV2(devfileV1.metadata),
      projects: (devfileV1.projects || []).map(project => this.projectV1toProjectV2(project)),
      components: (devfileV1.components || []).map(component => this.componentV1toComponentV2(component)),
      commands: (devfileV1.commands || []).map(command => this.commandV1toCommandV2(command)),
    };
    if (devfileV1.attributes) {
      devfileV2.metadata.attributes = devfileV2.metadata.attributes || {};
      Object.keys(devfileV1.attributes).forEach(attributeName => {
        devfileV2.metadata.attributes![attributeName] = devfileV1.attributes![attributeName];
      });
    }
    return devfileV2;
  }

  devfileV2toDevfileV1(devfileV2: Devfile): cheApi.workspace.devfile.Devfile {
    const devfileV1 = {
      apiVersion: '1.0.0',
      metadata: this.metadataV2toMetadataV1(devfileV2.metadata),
      projects: (devfileV2.projects || []).map(project => this.projectV2toProjectV1(project)),
      components: (devfileV2.components || []).map(component => this.componentV2toComponentV1(component)),
      commands: (devfileV2.commands || []).map(command => this.commandV2toCommandV1(command)),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const devfileV1Any = devfileV1 as any;

    if (devfileV1.components.length === 0) {
      delete devfileV1Any.components;
    }
    if (devfileV1.projects.length === 0) {
      delete devfileV1Any.projects;
    }
    if (devfileV1.commands.length === 0) {
      delete devfileV1Any.commands;
    }
    return devfileV1;
  }

  async get(): Promise<Devfile> {
    const workspace = await this.workspaceService.currentWorkspace();
    const devfileV1 = workspace.devfile!;
    return this.devfileV1toDevfileV2(devfileV1);
  }
  async getComponentStatuses(): Promise<DevfileComponentStatus[]> {
    // grab current workspace
    const workspace = await this.workspaceService.currentWorkspace();

    // grab runtime
    const componentStatuses: DevfileComponentStatus[] = [];

    const runtime = workspace.runtime;

    const machines = runtime?.machines || {};

    for (const machineName of Object.keys(machines)) {
      const machine = machines[machineName] || {};
      const isFromDevfile = (machine.attributes || {}).component !== undefined;
      const componentStatus: DevfileComponentStatus = { name: machineName, isUser: isFromDevfile };

      // endpoints
      const servers = machine.servers || {};
      const endpoints: {
        [endpointName: string]: {
          url?: string;
        };
      } = {};
      componentStatus.endpoints = endpoints;
      for (const serverName of Object.keys(servers)) {
        const server = servers[serverName] || {};
        const url = server.url;
        endpoints[serverName] = {
          url,
        };
      }
      componentStatuses.push(componentStatus);
    }
    return componentStatuses;
  }

  async updateDevfile(devfile: Devfile): Promise<void> {
    const workspace = await this.workspaceService.currentWorkspace();

    // convert devfile v2 to devfile v1
    const devfileV1 = {
      projects: (devfile.projects || []).map(project => this.projectV2toProjectV1(project)),
      components: [],
    };

    workspace.devfile = devfileV1;
    await this.workspaceService.updateWorkspace(workspace.id!, workspace);
  }
}
