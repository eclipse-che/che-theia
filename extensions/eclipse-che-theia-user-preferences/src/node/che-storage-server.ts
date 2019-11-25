/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { StorageServer } from '../common/storage-server';
import { resolve } from 'path';
import { homedir } from 'os';
import { readFile, writeFile, ensureDir, pathExists } from 'fs-extra';
import { injectable, postConstruct } from 'inversify';

const THEIA_STORAGE_PATH = resolve(homedir(), '.theia', 'storage');
const ILLEGAL_CHARACTERS = /[\/\?<>\\:\*\|"]/g;
const REPLACEMENT_CHARACTER = '$';

@injectable()
export class CheStorageServer implements StorageServer {

    @postConstruct()
    protected init(): void {
        ensureDir(THEIA_STORAGE_PATH);
    }

    setData(key: string, data: string): Promise<void> {
        return writeFile(resolve(THEIA_STORAGE_PATH, key.replace(ILLEGAL_CHARACTERS, REPLACEMENT_CHARACTER)), data);
    }
    async getData(key: string): Promise<string | undefined> {
        const filePath = resolve(THEIA_STORAGE_PATH, key.replace(ILLEGAL_CHARACTERS, REPLACEMENT_CHARACTER));
        if (await pathExists(filePath)) {
            return readFile(filePath, 'utf8');
        } else {
            return undefined;
        }
    }

}
