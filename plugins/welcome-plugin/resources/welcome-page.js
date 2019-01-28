/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

let api;

(function () {
    if (typeof acquireTheiaApi === 'undefined') {
        return
    }
    api = acquireTheiaApi();

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', function (event) {
        const message = event.data; // The json data that the extension sent
        
    })
}());


function executeCommand(commandName) {
    api.postMessage({
               command: 'executeCommand',
                commandName: commandName
            });
}