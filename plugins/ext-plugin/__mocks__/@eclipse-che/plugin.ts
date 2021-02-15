/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

/**
 * Mock of @eclipse-che/plugin module
 * @author Florent Benoit
 */
const che: any = {};
let currentWorkspace: any = undefined;

che.setWorkspaceOutput = (input: any) => {
  currentWorkspace = input;
};

che.workspace = {};

che.workspace.getCurrentWorkspace = () => {
  return currentWorkspace;
};

module.exports = che;
