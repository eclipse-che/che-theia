/*
 * Copyright (c) 2018 Red Hat, Inc.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { Repository } from "../src/repository";

describe("Test Repository", () => {

    test("test valid repository", async () => {
        const repository = new Repository("https://github.com/eclipse/che");
        expect(repository.getRepositoryName()).toBe("che");
    });

    test("test invalid repository", async () => {
        let error;
        const repository = new Repository("https://foo.com");
        try {
            await repository.getRepositoryName();
        } catch (err) {
            error = err;
        }
        expect(error).toBeDefined();
    });

});
