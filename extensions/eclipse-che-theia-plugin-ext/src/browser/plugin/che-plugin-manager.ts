/**********************************************************************
 * Copyright (c) 2018-2022 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import {
  Changes,
  ChePluginMetadata,
  ChePluginRegistries,
  ChePluginRegistry,
  ChePluginService,
} from '@eclipse-che/theia-remote-api/lib/common/plugin-service';
import { ConfirmDialog, OpenerService } from '@theia/core/lib/browser';
import { ConnectionStatus, ConnectionStatusService } from '@theia/core/lib/browser/connection-status-service';
import { Emitter, Event, MessageService, MessageType, ProgressMessage, ProgressService } from '@theia/core/lib/common';
import { PreferenceChange, PreferenceScope, PreferenceService } from '@theia/core/lib/browser/preferences';
import { inject, injectable, postConstruct } from 'inversify';

import { ChePluginFrontentService } from './che-plugin-frontend-service';
import { ChePluginPreferences } from './che-plugin-preferences';
import { ChePluginServiceClientImpl } from './che-plugin-service-client';
import { DashboardService } from '@eclipse-che/theia-remote-api/lib/common/dashboard-service';
import { DevfileService } from '@eclipse-che/theia-remote-api/lib/common/devfile-service';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import { PluginFilter } from './plugin-filter';
import { PluginServer } from '@theia/plugin-ext/lib/common/plugin-protocol';
import URI from '@theia/core/lib/common/uri';
import { WorkspaceService } from '@eclipse-che/theia-remote-api/lib/common/workspace-service';

import debounce = require('lodash.debounce');

export type ChePluginStatus =
  | 'not_installed'
  | 'installed'
  | 'installing'
  | 'removing'
  | 'to_be_installed'
  | 'to_be_removed'
  | 'cancelling_installation'
  | 'cancelling_removal';

export interface ChePlugin {
  publisher: string;
  name: string;
  version: string;
  status: ChePluginStatus;
  versionList: {
    [version: string]: ChePluginMetadata;
  };
}

@injectable()
export class ChePluginManager {
  /**
   * Default plugin registry
   */
  private defaultRegistry: ChePluginRegistry;

  /**
   * Registry list
   */
  private registryList: ChePluginRegistry[];

  /**
   * List of installed plugins in format ${publisher}/${name}/${version}
   * Initialized by plugins received from workspace config.
   */
  private installedPlugins: string[];

  /**
   * List of plugins in format ${publisher}/${name}/${version}
   * that will be installed and removed.
   */
  private changes: Changes = { toInstall: [], toRemove: [] };

  @inject(ChePluginService)
  protected readonly chePluginService: ChePluginService;

  @inject(DashboardService)
  protected readonly dashboardService: DashboardService;

  @inject(PluginServer)
  protected readonly pluginServer: PluginServer;

  @inject(MessageService)
  protected readonly messageService: MessageService;

  @inject(ProgressService)
  protected readonly progressService: ProgressService;

  @inject(ConnectionStatusService)
  protected readonly connectionStatusService: ConnectionStatusService;

  @inject(EnvVariablesServer)
  protected readonly envVariablesServer: EnvVariablesServer;

  @inject(ChePluginPreferences)
  protected readonly chePluginPreferences: ChePluginPreferences;

  @inject(PreferenceService)
  protected readonly preferenceService: PreferenceService;

  @inject(ChePluginFrontentService)
  protected readonly pluginFrontentService: ChePluginFrontentService;

  @inject(WorkspaceService)
  protected readonly workspaceService: WorkspaceService;

  @inject(ChePluginServiceClientImpl)
  protected readonly chePluginServiceClient: ChePluginServiceClientImpl;

  @inject(OpenerService)
  protected readonly openerService: OpenerService;

  @inject(DevfileService)
  protected readonly devfileService: DevfileService;

  private pageReloadURL: string | undefined;

  protected onInitialized: () => void;
  protected onInitializationFailed: () => void;

  protected init: Promise<void> = new Promise<void>((resolve, reject) => {
    this.onInitialized = resolve;
    this.onInitializationFailed = reject;
  });

  @postConstruct()
  async onStart(): Promise<void> {
    try {
      await this.initDefaults();
      this.onInitialized();
    } catch (error) {
      this.onInitializationFailed();
    }

    const fireChanged = debounce(() => this.pluginRegistryListChangedEvent.fire(), 5000);

    this.preferenceService.onPreferenceChanged(async (event: PreferenceChange) => {
      if (event.preferenceName !== 'chePlugins.repositories') {
        return;
      }

      const oldPrefs = event.oldValue;
      if (oldPrefs) {
        for (const repoName of Object.keys(oldPrefs)) {
          const registry = this.registryList.find(r => r.name === repoName && r.internalURI === oldPrefs[repoName]);
          if (registry) {
            this.registryList.splice(this.registryList.indexOf(registry), 1);
          }
        }
      }

      const newPrefs = event.newValue;
      if (newPrefs) {
        for (const repoName of Object.keys(newPrefs)) {
          this.registryList.push({ name: repoName, internalURI: newPrefs[repoName], publicURI: newPrefs[repoName] });
        }
      }
      // notify that plugin registry list has been changed
      fireChanged();
    });

    this.chePluginServiceClient.onInvalidRegistryFound(async registry => {
      const result = await this.messageService.warn(
        `Invalid plugin registry URL: "${registry.internalURI}" is detected`,
        'Open settings.json'
      );
      if (result) {
        const homeDir = await this.envVariablesServer.getHomeDirUri();
        const uri = new URI(homeDir).resolve('.theia/settings.json');
        this.openerService.getOpener(uri).then(opener => opener.open(uri));
      }
    });

    this.chePluginServiceClient.onAskToInstallDependencies(async ask => {
      const confirm = new ConfirmDialog({
        title: 'Required Dependencies',
        msg: `Plugin requires to install ${ask.dependencies.toString()}`,
        ok: 'Install',
      });

      if (await confirm.open()) {
        // remove necessary dependencies from toRemove list if present
        ask.dependencies.forEach(dependency => {
          if (this.changes.toRemove.find(value => value === dependency)) {
            this.changes.toRemove = this.changes.toRemove.filter(value => value !== dependency);
          }
        });

        // add dependencies toInstall list
        ask.dependencies.forEach(dependency => {
          if (!this.changes.toInstall.find(value => value === dependency)) {
            this.changes.toInstall.push(dependency);
          }
        });

        // notify backend
        ask.confirm();
      } else {
        ask.deny();
      }
    });

    this.connectionStatusService.onStatusChange(status => {
      if (status === ConnectionStatus.OFFLINE) {
        this.handleOffline();
      }
    });
  }

  /********************************************************************************
   * Using to notify plugins view, that the plugin service is appying changes
   ********************************************************************************/

  protected readonly applyingChangesEvent = new Emitter<boolean>();

  get onApplyingChanges(): Event<boolean> {
    return this.applyingChangesEvent.event;
  }

  /********************************************************************************
   * Changing the Workspace Configuration
   ********************************************************************************/

  protected readonly workspaceConfigurationChangedEvent = new Emitter<void>();

  get onWorkspaceConfigurationChanged(): Event<void> {
    return this.workspaceConfigurationChangedEvent.event;
  }

  /********************************************************************************
   * Changing the list of Plugin Registries
   ********************************************************************************/

  protected readonly pluginRegistryListChangedEvent = new Emitter<void>();

  get onPluginRegistryListChanged(): Event<void> {
    return this.pluginRegistryListChangedEvent.event;
  }

  /**
   * Restores list of custom registries
   */
  private async restoreRegistryList(): Promise<void> {
    // wait for preference service
    await this.preferenceService.ready;

    const prefs = this.chePluginPreferences['chePlugins.repositories'];
    if (prefs) {
      Object.keys(prefs).forEach(repoName => {
        const uri = prefs[repoName];

        const registry = this.registryList.find(r => r.internalURI === uri);
        if (registry === undefined) {
          this.registryList.push({
            name: repoName,
            internalURI: uri,
            publicURI: uri,
          });
        }
      });
    }
  }

  private initialized = false;

  private deferredInstallation = false;

  private async initDefaults(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.defaultRegistry = await this.chePluginService.getDefaultRegistry();

    this.registryList = [this.defaultRegistry];
    await this.restoreRegistryList();

    // Get list of installed plugins
    this.installedPlugins = await this.chePluginService.getInstalledPlugins();

    // check for deferred installation
    this.deferredInstallation = await this.chePluginService.deferredInstallation();

    // for deferred installation get list of changes
    const unpersistedChanges = await this.chePluginService.getUnpersistedChanges();
    if (unpersistedChanges) {
      this.changes = {
        toInstall: [...unpersistedChanges.toInstall],
        toRemove: [...unpersistedChanges.toRemove],
      };
    } else {
      this.changes = { toInstall: [], toRemove: [] };
    }
  }

  isDeferredInstallation(): boolean {
    return this.deferredInstallation;
  }

  addRegistry(registry: ChePluginRegistry): void {
    this.registryList.push(registry);

    // Save list of custom repositories to preferences
    const prefs: { [index: string]: string } = {};
    this.registryList.forEach(r => {
      if (r.name !== 'Default') {
        prefs[r.name] = r.internalURI;
      }
    });

    this.preferenceService.set('chePlugins.repositories', prefs, PreferenceScope.User);

    // notify that plugin registry list has been changed
    this.pluginRegistryListChangedEvent.fire();
  }

  removeRegistry(registry: ChePluginRegistry): void {
    this.registryList = this.registryList.filter(r => r.internalURI !== registry.internalURI);
  }

  getRegistryList(): ChePluginRegistry[] {
    return this.registryList;
  }

  /**
   * Udates the Plugin cache
   */
  async updateCache(): Promise<void> {
    await this.init;

    /**
     * Need to prepare this object to pass the plugins array through RPC.
     *
     * https://github.com/eclipse-theia/theia/issues/4310
     * https://github.com/eclipse-theia/theia/issues/4757
     * https://github.com/eclipse-theia/theia/issues/4343
     */
    const registries: ChePluginRegistries = {};
    for (let i = 0; i < this.registryList.length; i++) {
      const registry = this.registryList[i];
      registries[registry.name] = registry;
    }

    /**
     * Scan devfile plugins for custom registry, add the registry to cache if detected.
     */
    const devfile = await this.devfileService.get();
    if (devfile.components) {
      devfile.components
        .filter(component => component.plugin && component.plugin.id && component.plugin.registryUrl)
        .forEach(component => {
          const registryUrl = component.plugin?.registryUrl!;
          const name = component.plugin?.id!;
          registries[name] = { name, internalURI: registryUrl, publicURI: registryUrl };
        });
    }

    await this.chePluginService.updateCache(registries);
  }

  /**
   * Returns plugin list from active registry
   */
  async getPlugins(filter: string): Promise<ChePlugin[]> {
    await this.init;

    if (PluginFilter.hasType(filter, '@builtin')) {
      try {
        return await this.getBuiltInPlugins(filter);
      } catch (error) {
        console.log(error);
        return [];
      }
    }

    const installedPluginsOnly = PluginFilter.hasType(filter, '@installed');
    return this.getAllPlugins(filter, installedPluginsOnly);
  }

  private async getBuiltInPlugins(filter: string): Promise<ChePlugin[]> {
    const rawBuiltInPlugins = await this.pluginFrontentService.getBuiltInPlugins(filter);
    return this.groupPlugins(rawBuiltInPlugins);
  }

  /**
   * Returns the list of available plugins for the active plugin registry.
   */
  private async getAllPlugins(filter: string, listInstalledOnly?: boolean): Promise<ChePlugin[]> {
    // get list of all plugins
    const rawPlugins = await this.chePluginService.getPlugins();
    const filteredPlugins = PluginFilter.filterPlugins(rawPlugins, filter);

    // group the plugins
    const grouppedPlugins = this.groupPlugins(filteredPlugins);

    // prepare list of installed plugins without versions and repository URI
    const installedPluginsInfo = this.getInstalledPluginsInfo();

    const installedPlugins: ChePlugin[] = [];

    // if the plugin is installed, we need to set the proper version
    grouppedPlugins.forEach(plugin => {
      // check whether plugin is installed
      installedPluginsInfo.forEach(value => {
        if (plugin.publisher === value.publisher && plugin.name === value.name) {
          // set plugin is installed
          plugin.status = 'installed';
          // set intalled version
          plugin.version = value.version;
          installedPlugins.push(plugin);
        }
      });

      // check whether plugin will be installed
      this.changes.toInstall.forEach(value => {
        const parts = value.split('/');
        if (plugin.publisher === parts[0] && plugin.name === parts[1]) {
          plugin.status = 'to_be_installed';
        }
      });

      // check whether plugin will be removed
      this.changes.toRemove.forEach(value => {
        const parts = value.split('/');
        if (plugin.publisher === parts[0] && plugin.name === parts[1]) {
          plugin.status = 'to_be_removed';
        }
      });
    });

    return listInstalledOnly ? installedPlugins : grouppedPlugins;
  }

  /**
   * Returns list of installed plugins including installed version.
   *
   * Plugin should be without version and must not include plugin source.
   *
   * Plugin record
   *     camel-tooling/vscode-apache-camel/0.0.14
   * must be replaced on
   *     camel-tooling/vscode-apache-camel
   *
   * Plugin record
   *     https://raw.githubusercontent.com/vitaliy-guliy/che-theia-plugin-registry/master/plugins/eclipse-che/tree-view-sample-plugin/0.0.1/meta.yaml
   * must be replaced on
   *     eclipse-che/tree-view-sample-plugin
   */
  private getInstalledPluginsInfo(): { publisher: string; name: string; version: string }[] {
    // prepare the list of registries
    // we need to remove the registry URI from the start of the plugin
    const registries: string[] = [];
    this.registryList.forEach(registry => {
      let uri = registry.internalURI;
      if (uri === this.defaultRegistry.internalURI) {
        return;
      }

      if (uri.endsWith('.json')) {
        uri = uri.substring(0, uri.lastIndexOf('/') + 1);
      } else if (!uri.endsWith('/')) {
        uri += '/';
      }

      registries.push(uri);
    });

    const plugins: { publisher: string; name: string; version: string }[] = [];

    this.installedPlugins.forEach(plugin => {
      if (plugin.endsWith('/meta.yaml')) {
        // it's non default registry
        // we have to remove '/meta.yaml' from the end
        plugin = plugin.substring(0, plugin.lastIndexOf('/'));
      }

      const version = plugin.substring(plugin.lastIndexOf('/') + 1);

      // remove the version by deleting all the text after the last '/' character, including '/'
      plugin = plugin.substring(0, plugin.lastIndexOf('/'));

      // remove registry URI from the start of the plugin
      registries.forEach(r => {
        if (plugin.startsWith(r)) {
          plugin = plugin.substring(r.length);
        }
      });

      const parts = plugin.split('/');

      plugins.push({
        publisher: parts[0],
        name: parts[1],
        version,
      });
    });

    return plugins;
  }

  /**
   * Groups all versions of the same plugin in one structure.
   */
  private groupPlugins(rawPlugins: ChePluginMetadata[]): ChePlugin[] {
    const pluginMap: { [pluginKey: string]: ChePlugin } = {};

    rawPlugins.forEach(plugin => {
      const pluginKey = `${plugin.publisher}/${plugin.name}`;
      let installationItem = pluginMap[pluginKey];
      if (!installationItem) {
        installationItem = {
          publisher: plugin.publisher,
          name: plugin.name,
          version: plugin.version,
          status: 'not_installed',
          versionList: {},
        };

        pluginMap[pluginKey] = installationItem;
      } else {
        installationItem.version = plugin.version;
      }

      installationItem.versionList[plugin.version] = plugin;
    });

    const chePlugins: ChePlugin[] = [];
    for (const key in pluginMap) {
      if (pluginMap.hasOwnProperty(key)) {
        chePlugins.push(pluginMap[key]);
      }
    }

    return chePlugins;
  }

  /**
   * Installs the plugin.
   */
  async install(plugin: ChePlugin): Promise<boolean> {
    const metadata = plugin.versionList[plugin.version];
    const pluginId = `${plugin.publisher}/${plugin.name}/${plugin.version}`;

    try {
      // add the plugin to workspace configuration
      const installed = await this.chePluginService.installPlugin(metadata.key);
      if (!installed) {
        return false;
      }

      if (this.deferredInstallation) {
        if (!this.changes.toInstall.find(value => value === pluginId)) {
          this.changes.toInstall.push(pluginId);
        }
      } else {
        this.messageService.info(`Plugin '${pluginId}' has been successfully installed`);
        // add the plugin to the list of workspace plugins
        this.installedPlugins.push(metadata.key);
      }

      // notify that workspace configuration has been changed
      this.notifyWorkspaceConfigurationChanged();

      return true;
    } catch (error) {
      this.messageService.error(`Unable to install plugin '${pluginId}'. ${error.message}`);
      return false;
    }
  }

  /**
   * Removes the plugin.
   */
  async remove(plugin: ChePlugin): Promise<boolean> {
    const metadata = plugin.versionList[plugin.version];
    const pluginId = `${plugin.publisher}/${plugin.name}/${plugin.version}`;

    try {
      // remove the plugin from workspace configuration
      await this.chePluginService.removePlugin(pluginId);

      if (this.deferredInstallation) {
        if (!this.changes.toRemove.find(value => value === pluginId)) {
          this.changes.toRemove.push(pluginId);
        }
      } else {
        this.messageService.info(`Plugin '${pluginId}' has been successfully removed`);

        // remove the plugin from the list of workspace plugins
        this.installedPlugins = this.installedPlugins.filter(p => p !== metadata.key);
      }

      // notify that workspace configuration has been changed
      this.notifyWorkspaceConfigurationChanged();
      return true;
    } catch (error) {
      this.messageService.warn(error.message ? error.message : error);
      return false;
    }
  }

  async undoInstall(plugin: ChePlugin): Promise<boolean> {
    const pluginId = `${plugin.publisher}/${plugin.name}/${plugin.version}`;

    try {
      // remove the plugin from workspace configuration
      await this.chePluginService.removePlugin(pluginId);

      this.changes.toInstall = this.changes.toInstall.filter(value => value !== pluginId);

      // notify that workspace configuration has been changed
      this.notifyWorkspaceConfigurationChanged();

      return true;
    } catch (error) {
      this.messageService.warn(error.message ? error.message : error);
      return false;
    }
  }

  async undoRemove(plugin: ChePlugin): Promise<boolean> {
    const pluginId = `${plugin.publisher}/${plugin.name}/${plugin.version}`;

    try {
      // call installPlugin to revert plugin removal
      await this.chePluginService.installPlugin(pluginId);
      this.changes.toRemove = this.changes.toRemove.filter(value => value !== pluginId);

      // notify that workspace configuration has been changed
      this.notifyWorkspaceConfigurationChanged();
      return true;
    } catch (error) {
      this.messageService.error(`Unable to remove plugin '${pluginId}'. ${error.message}`);
      return false;
    }
  }

  /**
   * Changes the plugin version.
   */
  async changeVersion(plugin: ChePlugin, versionBefore: string): Promise<boolean> {
    const metadataBefore = plugin.versionList[versionBefore];
    const metadata = plugin.versionList[plugin.version];
    try {
      await this.chePluginService.updatePlugin(metadataBefore.key, metadata.key);

      this.messageService.info(`Plugin '${metadata.publisher}/${metadata.name}' has been successfully updated`);

      // remove old plugin from the list of workspace plugins
      this.installedPlugins = this.installedPlugins.filter(p => p !== metadataBefore.key);

      // add new plugin to the list of workspace plugins
      this.installedPlugins.push(metadata.key);

      // notify that workspace configuration has been changed
      this.notifyWorkspaceConfigurationChanged();
      return true;
    } catch (error) {
      this.messageService.error(`Unable to upate plugin '${metadata.publisher}/${metadata.name}'. ${error.message}`);
      return false;
    }
  }

  private getIdPublisher(input: string): string {
    if (input.startsWith('ext install ')) {
      // check for 'ext install rebornix.Ruby'
      return input.substring('ext install '.length);
    } else if (input.startsWith('vscode:extension/')) {
      // check for 'vscode:extension/rebornix.Ruby'
      return input.substring('vscode:extension/'.length);
    }

    return '';
  }

  /**
   * Installs VS Code extension.
   */
  async installVSCodeExtension(command: string): Promise<boolean> {
    const idPublisher = this.getIdPublisher(command);
    try {
      await this.pluginServer.deploy(command);
      this.messageService.info(`VS Code plugin '${idPublisher}' has been installed`);
      return true;
    } catch (error) {
      this.messageService.error(`Unable to install VS Code plugin '${idPublisher}'`);
    }

    return false;
  }

  /**
   * Determines whether the `input` is a command to install VS Code extension.
   *
   * Returns VS Code extension `publisher.ID`
   */
  checkVsCodeExtension(input: string): string | undefined {
    try {
      const idPublisher = this.getIdPublisher(input);
      if (idPublisher) {
        const parts = idPublisher.split('.');
        if (parts.length === 2 && parts[0] && parts[1]) {
          return idPublisher;
        }
      }
    } catch (error) {
      console.log(error);
    }

    return undefined;
  }

  private notifyWorkspaceConfigurationChanged(): void {
    setTimeout(() => {
      this.workspaceConfigurationChangedEvent.fire();
    }, 500);
  }

  /**
   * Checks whether IDE is opened inside frame in dashboard.
   * If yes, IDE can send request to the dashboard to restart the workspace.
   */
  restartEnabled(): boolean {
    return window.parent !== window || this.deferredInstallation;
  }

  async restartWorkspace(): Promise<void> {
    const confirm = new ConfirmDialog({
      title: 'Restart Workspace',
      msg: 'Are you sure you want to restart your workspace?',
      ok: 'Restart',
    });

    if (await confirm.open()) {
      // get workspace ID
      const cheWorkspaceID = await this.workspaceService.getCurrentWorkspaceId();
      // get machine token
      const cheMachineToken = await this.envVariablesServer.getValue('CHE_MACHINE_TOKEN');
      this.messageService.info('Workspace is restarting...');
      const cheMachineTokenValue = cheMachineToken && cheMachineToken.value ? cheMachineToken.value : '';
      // ask Dashboard to restart the workspace giving him workspace ID & machine token
      window.parent.postMessage(`restart-workspace:${cheWorkspaceID}:${cheMachineTokenValue}`, '*');
    }
  }

  async finalizeInstallation(): Promise<void> {
    this.pageReloadURL = await this.dashboardService.getEditorUrl();

    try {
      if (this.pageReloadURL) {
        const confirm = new ConfirmDialog({
          title: 'Restart Workspace',
          msg: 'After applying changes your workspace will be restarted',
          ok: 'Apply and Restart',
        });

        if (await confirm.open()) {
          await this.appyChanges();
        }
      } else {
        await this.chePluginService.persist();
      }
    } catch (error) {
      this.messageService.error(error.message);
    }
  }

  private async appyChanges(): Promise<void> {
    this.applyingChangesEvent.fire(true);

    const message: ProgressMessage = {
      type: MessageType.Progress,
      text: 'Applying changes...',
      options: {
        location: 'notification',
      },
    };

    const progress = await this.progressService.showProgress(message);

    try {
      await this.chePluginService.persist();
      progress.report({
        work: {
          total: 1,
          done: 1,
        },
      });

      // in case ConnectionStatusService will not catch switching to offline mode,
      // this timer will guarantee the page will be reloaded
      await new Promise<void>(resolve => setTimeout(resolve, 5000));
      await this.handleOffline();
    } catch (e) {
      progress.cancel();

      this.messageService.error(e.message ? e.message : e);

      const confirm = new ConfirmDialog({
        title: 'Try again',
        msg: 'An error occured while applying changes. Would you like to retry?',
        ok: 'Retry',
      });

      if (await confirm.open()) {
        await this.appyChanges();
      } else {
        this.pageReloadURL = undefined;
        this.applyingChangesEvent.fire(false);
      }
    }
  }

  async handleOffline(): Promise<void> {
    if (this.pageReloadURL) {
      // timeout here lets Theia to update the UI after switching to offline mode
      await new Promise<void>(resolve => setTimeout(resolve, 500));
      window.location.replace(this.pageReloadURL);
    }
  }
}
