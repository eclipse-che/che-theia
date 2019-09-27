/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

interface Resource {
    // Title for Welcome tab
    title: string;
    // Icon for Welcome tab
    icon: string;
    // Logo image
    logo: string;
    // Product name
    product: string;
    // A short description under product name
    subtitle: string;
    // List of hyperlinks to be shown in Help section
    links: { [text: string]: string }
}

declare const value: Resource;
export = value;
