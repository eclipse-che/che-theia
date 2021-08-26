/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Repository } from '../src/repository';

describe('Test Repository', () => {
    test('test valid repository', async () => {
        let repository = new Repository('https://github.com/eclipse/che');
        expect(repository.getRepositoryName()).toBe('che');
        repository = new Repository('https://github.com/eclipse/che.git');
        expect(repository.getRepositoryName()).toBe('che');
        repository = new Repository('git@github.com:eclipse-che/che-theia.git');
        expect(repository.getRepositoryName()).toBe('che-theia');
        repository = new Repository('file:///var/folders/path/source-code1');
        expect(repository.getRepositoryName()).toBe('source-code1');
    });

    test('test invalid repository', async () => {
        let error;
        const repository = new Repository('https://foo.com');
        try {
            repository.getRepositoryName();
        } catch (err) {
            error = err;
        }
        expect(error).toBeDefined();
    });
});
