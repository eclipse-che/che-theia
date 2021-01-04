/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as theia from '@theia/plugin';

import { WebviewImpl, WebviewsExtImpl } from '@theia/plugin-ext/lib/plugin/webviews';

import { Plugin } from '@theia/plugin-ext/src/common/plugin-api-rpc';
import { Uri } from '@theia/plugin';
import { overrideUri } from './che-content-aware-utils';

export class RemoteWebview extends WebviewImpl {}

export class WebviewsContentAware {
  static makeWebviewsContentAware(webviewExt: WebviewsExtImpl): void {
    const webviewsContentAware = new WebviewsContentAware();
    webviewsContentAware.overrideVSCodeResourceScheme(webviewExt);
  }

  overrideVSCodeResourceScheme(webviewExt: WebviewsExtImpl): void {
    this.rebind$createWebview(webviewExt);
  }

  // Modify WebviewOptions#localResourceRoots by setting remote side car scheme instead of default file
  // during webview panel create step. This method activates only when plugin call theia.createWebview
  // method from remote sidecar. Normally from theia sidecar this method should not be executed.
  //
  // localResourceRoots provides paths where extension hosts own resources, styles, scripts, fonts, etc.
  private rebind$createWebview(webviewExt: WebviewsExtImpl): void {
    const original$createWebview = webviewExt.createWebview.bind(webviewExt);
    webviewExt.createWebview = (
      viewType: string,
      title: string,
      showOptions: theia.ViewColumn | theia.WebviewPanelShowOptions,
      options: theia.WebviewPanelOptions & theia.WebviewOptions,
      plugin: Plugin
    ) => {
      const webviewPanel: theia.WebviewPanel = original$createWebview(
        viewType,
        title,
        showOptions,
        options.localResourceRoots
          ? ({
              enableFindWidget: options.enableFindWidget,
              retainContextWhenHidden: options.retainContextWhenHidden,
              enableScripts: options.enableScripts,
              enableCommandUris: options.enableCommandUris,
              localResourceRoots: (() => options.localResourceRoots.map(root => overrideUri(root)))(),
              portMapping: options.portMapping,
            } as theia.WebviewPanelOptions & theia.WebviewOptions)
          : options,
        plugin
      );

      this.rebind$asWebviewUri(webviewPanel.webview);
      this.rebind$_htmlSetter(webviewPanel.webview);

      return webviewPanel;
    };
  }

  // Method theia.Webview#asWebviewUri is being called from theia container.
  // In default flow method returns the path like: /webview/theia-resource/file:///path/to/directory
  // with https scheme and authority
  private rebind$asWebviewUri(webview: theia.Webview): void {
    const original$asWebviewUri = webview.asWebviewUri.bind(webview);
    webview.asWebviewUri = (resource: Uri) => original$asWebviewUri(overrideUri(resource));
  }

  // Browser part perform preprocess initial html content by replacing vscode-resource:/path/to/file
  // to https://authority/webview/theia-resource/file/path/to/file. To be able to operate with custom
  // provided scheme, we can perform replacing the initial html by appending remote sidecar scheme, so
  // we will get links look like vscode-resource://scheme/path/to/file. Webview.html organized via
  // getter and setter, so we cant really bind method, instead of this, we redefine setter property.
  // We need to leave backward compatibility with vscode resources that loads remotely.
  private rebind$_htmlSetter(webview: theia.Webview): void {
    Object.defineProperty(webview, '_html', {
      get: function () {
        // @ts-ignore
        return this._html;
      }.bind(this),
      set: function (value: string) {
        const sideCarScheme = `file-sidecar-${process.env.CHE_MACHINE_NAME}`;
        // @ts-ignore
        this._html = value.replace(
          /(["'])(vscode|theia)-resource:(\/\/([^\s\/'"]+?)(?=\/))?([^\s'"]+?)(["'])/gi,
          (_, startQuote, resourceType, _1, scheme, path, endQuote) => {
            if (scheme) {
              return _;
            }
            return `${startQuote}${resourceType}-resource://${sideCarScheme}${path}${endQuote}`;
          }
        );
      }.bind(this),
    });
  }
}
