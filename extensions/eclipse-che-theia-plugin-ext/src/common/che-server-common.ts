/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

export function getUrlDomain(routeUrl: string): string {
    // Remove trailing slash if any
    if (routeUrl.endsWith('/')) {
        routeUrl = routeUrl.substring(0, routeUrl.length - 1);
    }
    // Remove protocol
    const webviewDomain = routeUrl.replace(/^https?:\/\//, '');

    return webviewDomain;
}

export const SERVER_TYPE_ATTR = 'type';
export const SERVER_IDE_ATTR_VALUE = 'ide';
export const SERVER_IDE_DEV_ATTR_VALUE = 'ide-dev';
