/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { URL } from 'url';
import { resolve } from 'path';

/**
 * Apply segments to the url endpoint, where are:
 * @param endPointUrl - url endpoint, for example 'http://ws:/some-server/api'
 * @param pathSegements - array path segements, which should be applied one by one to the url.
 * Example:
 * applySegmentsToUri('http://ws:/some-server/api', 'connect', `1`)) => http://ws/some-server/api/connect/1
 * applySegmentsToUri('http://ws:/some-server/api/', 'connect', `1`)) => http://ws/some-server/api/connect/1
 * applySegmentsToUri('http://ws:/some-server/api//', 'connect', `1`)) => http://ws/some-server/api/connect/1
 * applySegmentsToUri('http://ws:/some-server/api', '/connect', `1`)) => error, segment should not contains '/'
 */
export function applySegmentsToUri(endPointUrl: string, ...pathSegements: string[]): string {
    const urlToTranform: URL = new URL(endPointUrl);

    for (const segment of pathSegements) {
        if (segment.indexOf('/') > -1) {
            throw new Error(`path segment ${segment} contains '/'`);
        }
        urlToTranform.pathname = resolve(urlToTranform.pathname, segment);
    }

    return urlToTranform.toString();
}
