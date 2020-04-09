/*
 * Copyright (c) 2019 Red Hat, Inc.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */
import { convertToFileURI, convertToCheProjectPath } from '../src/file-uri'

describe('Test exec commands', () => {

    test('Convert a openfile file property to file URI', async () => {
        expect(convertToFileURI('/che/README.md')).toBe('file:///projects/che/README.md');
        expect(convertToFileURI('che/README.md')).toBe('file:///projects/che/README.md');
        expect(convertToFileURI('file:///test-project/che/README.md')).toBe('file:///test-project/che/README.md');
        expect(convertToFileURI('che/README.md', '/test-projects')).toBe('file:///test-projects/che/README.md');
        expect(convertToFileURI('che/README.md', 'file:///test-projects')).toBe('file:///test-projects/che/README.md');
        expect(convertToFileURI('/che/README.md', '/test-projects')).toBe('file:///test-projects/che/README.md');
        expect(convertToFileURI('/che/README.md', 'file:///test-projects')).toBe('file:///test-projects/che/README.md');
        expect(convertToFileURI('/che/README.md', 'test-projects')).toBe('file:///test-projects/che/README.md');
        expect(convertToFileURI('/che/', 'test-projects')).toBe('file:///test-projects/che/');

    });
});

describe('Testing convertion of project paths to be stored in the workspace config', () => {
    test('Converting fs project path to che project path', async () => {
        expect(convertToCheProjectPath('/projects/che-workspace-extension/', '/projects')).toBe('che-workspace-extension');
        expect(convertToCheProjectPath('/projects/che-workspace-extension', '/projects')).toBe('che-workspace-extension');
        expect(convertToCheProjectPath('/projects/che/che-workspace-extension/', '/projects')).toBe('che/che-workspace-extension');
        expect(convertToCheProjectPath('/projects/theiadev_projects/blog.sunix.org/', '/projects/theiadev_projects')).toBe('blog.sunix.org');
        expect(convertToCheProjectPath('/projects/che/che-workspace-extension/', '')).toBe('che/che-workspace-extension');
    });
});
