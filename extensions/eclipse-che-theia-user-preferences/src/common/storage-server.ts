/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

export const storageServerPath = '/che-storage';
export const StorageServer = Symbol('StorageServer');
export interface StorageServer {

    setData(key: string, data: string): Promise<void>;
    getData(key: string): Promise<string | undefined>;
}
