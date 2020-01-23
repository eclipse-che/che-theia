/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { Container } from 'inversify';
import { CheTaskProvider } from './task/che-task-provider';
import { MachinesPicker } from './machine/machines-picker';
import { ProjectPathVariableResolver } from './variable/project-path-variable-resolver';
import { CheTaskRunner } from './task/che-task-runner';
import { ServerVariableResolver } from './variable/server-variable-resolver';
import { MachineExecClient } from './machine/machine-exec-client';
import { MachineExecWatcher } from './machine/machine-exec-watcher';
import { CheTaskEventsHandler } from './preview/task-events-handler';
import { TasksPreviewManager } from './preview/tasks-preview-manager';
import { PreviewUrlsWidgetFactory, PreviewUrlsWidget, PreviewUrlsWidgetOptions } from './preview/previews-widget';
import { CheTaskPreviewMode } from './preview/task-preview-mode';
import { PreviewUrlOpenService } from './preview/preview-url-open-service';
import { CheWorkspaceClient } from './che-workspace-client';
import { LaunchConfigurationsExporter } from './export/launch-configs-exporter';
import { TaskConfigurationsExporter } from './export/task-configs-exporter';
import { ExportConfigurationsManager, ConfigurationsExporter } from './export/export-configs-manager';
import { CheTaskConfigsExtractor } from './extract/che-task-configs-extractor';
import { ConfigFileLaunchConfigsExtractor } from './extract/config-file-launch-configs-extractor';
import { ConfigFileTasksExtractor } from './extract/config-file-task-configs-extractor';
import { VsCodeLaunchConfigsExtractor } from './extract/vscode-launch-configs-extractor';
import { VsCodeTaskConfigsExtractor } from './extract/vscode-task-configs-extractor';
import { PreviewUrlVariableResolver } from './variable/preview-url-variable-resolver';
import { BackwardCompatibilityResolver } from './task/backward-compatibility';
import { TaskStatusHandler } from './task/task-status';

const container = new Container();
container.bind(CheTaskProvider).toSelf().inSingletonScope();
container.bind(CheTaskEventsHandler).toSelf().inSingletonScope();
container.bind(TasksPreviewManager).toSelf().inSingletonScope();
container.bind(CheTaskRunner).toSelf().inSingletonScope();
container.bind(MachinesPicker).toSelf().inSingletonScope();
container.bind(MachineExecClient).toSelf().inSingletonScope();
container.bind(MachineExecWatcher).toSelf().inSingletonScope();
container.bind(ServerVariableResolver).toSelf().inSingletonScope();
container.bind(PreviewUrlVariableResolver).toSelf().inSingletonScope();
container.bind(ProjectPathVariableResolver).toSelf().inSingletonScope();
container.bind(CheWorkspaceClient).toSelf().inSingletonScope();
container.bind(CheTaskPreviewMode).toSelf().inSingletonScope();
container.bind(PreviewUrlOpenService).toSelf().inSingletonScope();
container.bind<ConfigurationsExporter>(ConfigurationsExporter).to(TaskConfigurationsExporter).inSingletonScope();
container.bind<ConfigurationsExporter>(ConfigurationsExporter).to(LaunchConfigurationsExporter).inSingletonScope();
container.bind(ExportConfigurationsManager).toSelf().inSingletonScope();
container.bind(CheTaskConfigsExtractor).toSelf().inSingletonScope();
container.bind(ConfigFileTasksExtractor).toSelf().inSingletonScope();
container.bind(ConfigFileLaunchConfigsExtractor).toSelf().inSingletonScope();
container.bind(VsCodeLaunchConfigsExtractor).toSelf().inSingletonScope();
container.bind(VsCodeTaskConfigsExtractor).toSelf().inSingletonScope();
container.bind(BackwardCompatibilityResolver).toSelf().inSingletonScope();
container.bind(TaskStatusHandler).toSelf().inSingletonScope();

container.bind(PreviewUrlsWidget).toSelf().inTransientScope();
container.bind(PreviewUrlsWidgetFactory).toDynamicValue(ctx => ({
    createWidget: (options: PreviewUrlsWidgetOptions) => {
        const child = new Container({ defaultScope: 'Singleton' });
        child.parent = ctx.container;
        child.bind(PreviewUrlsWidgetOptions).toConstantValue(options);
        return child.get(PreviewUrlsWidget);
    }
}));

export { container };
