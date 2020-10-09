/*********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

/**
 * Categorize the endpoint, by specifying if definition comes from a plug-ins
 * (meta.yaml devfile v1  definition) or from devfile itself
 */
export enum EndpointCategory {
    /**
     * Defined in a plug-in (like theia, etc.)
     */
    PLUGINS,

    /**
     * Defined in the user devfile (not linked through a chePlugin/cheEditor)
     */
    USER
}
