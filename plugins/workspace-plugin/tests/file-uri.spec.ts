/**********************************************************************
 * Copyright (c) 2019-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { convertToCheProjectPath } from '../src/file-uri';

describe('Testing convertion of project paths to be stored in the workspace config', () => {
  test('Converting fs project path to che project path', async () => {
    expect(convertToCheProjectPath('/projects/che-workspace-extension/', '/projects')).toBe('che-workspace-extension');
    expect(convertToCheProjectPath('/projects/che-workspace-extension', '/projects')).toBe('che-workspace-extension');
    expect(convertToCheProjectPath('/projects/che/che-workspace-extension/', '/projects')).toBe(
      'che/che-workspace-extension'
    );
    expect(convertToCheProjectPath('/projects/theiadev_projects/blog.sunix.org/', '/projects/theiadev_projects')).toBe(
      'blog.sunix.org'
    );
  });
});
