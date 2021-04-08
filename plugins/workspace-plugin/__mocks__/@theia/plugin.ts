/**********************************************************************
 * Copyright (c) 2020-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const theiaPlugin: any = {};
theiaPlugin.OutputChannel = {};
theiaPlugin.window = {
  createOutputChannel: jest.fn(),
  withProgress: jest.fn(),
  showWarningMessage: jest.fn(),
  showInformationMessage: jest.fn(),
};

export class EventEmitter {
  constructor() {}
  fire() {}
}

theiaPlugin.Disposable = {
  create: jest.fn(),
};

theiaPlugin.ProgressLocation = {
  Notification: 15,
};

theiaPlugin.EventEmitter = EventEmitter;
module.exports = theiaPlugin;
