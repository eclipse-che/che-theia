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
import * as path from 'path';
import { resolve } from 'path';
import * as jsoncparser from 'jsonc-parser';
import { FormattingOptions, ParseError, JSONPath } from 'jsonc-parser';

const fs = require('fs');

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
    const urlToTransform: URL = new URL(endPointUrl);

    for (const segment of pathSegements) {
        if (segment.indexOf('/') > -1) {
            throw new Error(`path segment ${segment} contains '/'`);
        }
        urlToTransform.pathname = resolve(urlToTransform.pathname, segment);
    }

    return urlToTransform.toString();
}

/** Parses the given content and returns the object the JSON content represents. */
// tslint:disable-next-line:no-any
export function parse(content: string): any {
    const strippedContent = jsoncparser.stripComments(content);
    const errors: ParseError[] = [];
    const configurations = jsoncparser.parse(strippedContent, errors);

    if (errors.length) {
        for (const e of errors) {
            console.error(`Error parsing configurations: error: ${e.error}, length:  ${e.length}, offset:  ${e.offset}`);
        }
        return '';
    } else {
        return configurations;
    }
}

/** Formats content according to given formatting  options */
export function format(content: string, options: FormattingOptions): string {
    const edits = jsoncparser.format(content, undefined, options);
    return jsoncparser.applyEdits(content, edits);
}

/**
 * Modifies JSON document using json path, value and options.
 *
 * @param content JSON document for changes
 * @param jsonPath path of the value to change - the document root, a property or an array item.
 * @param value new value for the specified property or item.
 * @param options options to apply formatting
 */
// tslint:disable-next-line:no-any
export function modify(content: string, jsonPath: JSONPath, value: any, options: FormattingOptions): string {
    const edits = jsoncparser.modify(content, jsonPath, value, { formattingOptions: options });
    return jsoncparser.applyEdits(content, edits);
}

/** Synchronously reads the file by given path. Returns content of the file or empty string if file doesn't exist */
export function readFileSync(filePath: string): string {
    try {
        return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
    } catch (e) {
        console.error(e);
        return '';
    }
}

/** Synchronously writes  given content to the file. Creates directories to the file if they don't exist */
export function writeFileSync(filePath: string, content: string): void {
    ensureDirExistence(filePath);
    fs.writeFileSync(filePath, content);
}

/** Synchronously creates a directory to the file if they don't exist */
export function ensureDirExistence(filePath: string) {
    const dirName = path.dirname(filePath);
    if (fs.existsSync(dirName)) {
        return;
    }
    fs.mkdirSync(dirName, { recursive: true });
}
