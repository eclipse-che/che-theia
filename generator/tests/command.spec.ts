/*
 * Copyright (c) 2018 Red Hat, Inc.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { Command } from "../src/command";

describe("Test Command", () => {

    test("test exec", async () => {
        const command = new Command(__dirname);
        const result = await command.exec("echo 'foo'");
        expect(result).toBe("foo\n");
    });

    test("test exec error", async () => {
        let error;
        const command = new Command(__dirname);
        try {
            await command.exec("invalid-command-not-exists");
        } catch (err) {
            error = err;
        }
        expect(error).toBeDefined();
    });

});
