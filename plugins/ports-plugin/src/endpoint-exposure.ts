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
 * Defines the type of the exposure of an endpoint
 * contained in the devfile, created at runtime, etc.
 */
export enum EndpointExposure {
    /**
     * Defined by devfile 2.0 specification
     * public means that the endpoint will be exposed on the public network, typically through a K8S ingress
     *  or an OpenShift route.
     */
    FROM_DEVFILE_PUBLIC,

    /**
     * internal means that the endpoint will be exposed internally outside of the main workspace POD,
     * typically by K8S services, to be consumed by other elements running on the same cloud internal network.
     */
    FROM_DEVFILE_PRIVATE,

    /**
     * none means that the endpoint will not be exposed and will only be accessible inside the main workspace POD,
     * on a local address.
     */
    FROM_DEVFILE_NONE,

    /**
     * This endpoint has been created to forward a local port publicly
     */
    FROM_RUNTIME_PORT_FORWARDING,

    /**
     * Process started by the user but not specified anywhere of the devfile.
     */
    FROM_RUNTIME_USER,
}
