/*
 * Copyright (c) 2018 Red Hat, Inc.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

require("../../src/cdn/bootstrap");
import { CheCdnSupport } from "../../src/cdn/base";

describe("Test bootstrap", () => {
    
    test("test CheCdnSupport added in window object", async () => {
        expect((<any>window).CheCdnSupport).toBe(CheCdnSupport);
    });
});
