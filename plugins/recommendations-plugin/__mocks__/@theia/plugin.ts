/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
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
 * @author Florent Benoit
 */
const theia: any = {};
const outputChannel =
{
  appendLine: jest.fn(),
}
theia.window = {};
theia.window.createOutputChannel = jest.fn();
theia.window.createOutputChannel.mockReturnValue(outputChannel);
theia.plugins = {};
theia.plugins.all = [];
theia.window.showInformationMessage = jest.fn();
theia.workspace = {
  workspaceFolders: undefined,
  onDidOpenTextDocument: jest.fn(),
};
theia.plugins.getPlugin = jest.fn();
module.exports = theia;
