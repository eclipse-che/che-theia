/*
 * Copyright (c) 2018 Red Hat, Inc.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */
import { TheiaCommand } from "../src/theia-commands";
import convertToFileURI from "../src/openfile"

describe("Test exec commands", () => {

    test("test conversion of openfile file property to file URI", async () => {
        //const theiaCommand = new TheiaCommand("openFile", {file: 'che/README.md'});
        //       openFileCommand.execute().then()
        expect(convertToFileURI('/che/README.md')).toBe('file:///projects/che/README.md');
        expect(convertToFileURI('che/README.md')).toBe('file:///projects/che/README.md');
        expect(convertToFileURI('file:///test-project/che/README.md')).toBe('file:///test-project/che/README.md');
        expect(convertToFileURI('che/README.md', '/test-projects')).toBe('file:///test-projects/che/README.md');
        expect(convertToFileURI('che/README.md', 'file:///test-projects')).toBe('file:///test-projects/che/README.md');
        expect(convertToFileURI('/che/README.md', '/test-projects')).toBe('file:///test-projects/che/README.md');
        expect(convertToFileURI('/che/README.md', 'file:///test-projects')).toBe('file:///test-projects/che/README.md');
        expect(convertToFileURI('/che/README.md', 'test-projects')).toBe('file:///test-projects/che/README.md');
    });
});
