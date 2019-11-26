"use strict";
/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
Object.defineProperty(exports, "__esModule", { value: true });
var theia = require("@theia/plugin");
var che = require("@eclipse-che/plugin");
function start(context) {
    che.telemetry.event('WORKSPACE_START', {});
    var SubmitEditTelemetryEventCommand = {
        id: 'telemetry-plugin-file-edit-event',
        label: 'Submit Edit File Telemetry Event'
    };
    // tslint:disable-next-line:no-any
    context.subscriptions.push(theia.commands.registerCommand(SubmitEditTelemetryEventCommand, function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        theia.window.showInputBox({ prompt: 'Enter file type: ' }, undefined)
            .then(function (t) {
            console.log('In the callback of InputBox with value: ', t);
            if (t) {
                che.telemetry.event('EDITOR_USED', {
                    'programming language': t
                });
            }
        });
    }));
}
exports.start = start;
function stop() {
}
exports.stop = stop;
//# sourceMappingURL=telemetry-plugin.js.map