/**********************************************************************
 * Copyright (c) 2018-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { customizeWebpackConfig } from './webpack-customizer';

// Retrieve the default, generated, Theia Webpack configuration
const baseConfig = require('../webpack.config');

// Export the customized webpack configuration object
module.exports = function (env: { cdn: string; monacopkg: string }) {
    customizeWebpackConfig(env.cdn, env.monacopkg, baseConfig);
    return baseConfig;
};
