/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Mock of @theia/plugin module
 * @author Valerii Svydenko
 */
const theia: any = {};
theia.PluginContext = {};
theia.commands = {};
theia.commands.registerCommand = jest.fn();
theia.StatusBarAlignment = {};
theia.StatusBarAlignment.Left = 1;
theia.StatusBarItem = {};
theia.StatusBarItem.color = '';
theia.window = {};
theia.plugins = {};
theia.window.createStatusBarItem = jest.fn();
theia.window.showQuickPick = jest.fn();
theia.window.showWarningMessage = jest.fn();
module.exports = theia;
