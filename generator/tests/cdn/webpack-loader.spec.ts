/*
 * Copyright (c) 2018 Red Hat, Inc.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

const exported = require("../../src/cdn/webpack-loader");
import { CheCdnSupport } from "../../src/cdn/base";

describe("Test webpack-loader", () => {
    
    test("test CheCdnSupport.webpackLoader function is exported", async () => {
        expect(exported).toBe(CheCdnSupport.webpackLoader);
    });
});
