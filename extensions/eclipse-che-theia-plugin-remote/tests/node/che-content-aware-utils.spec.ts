/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { URI } from 'vscode-uri';
import { overrideUri } from '../../src/node/che-content-aware-utils';

describe('Test overrideUri', () => {
  test('Should return the same uri if machine name is not defined', () => {
    process.env.CHE_MACHINE_NAME = '';

    const uri = URI.from({
      scheme: 'file',
      path: '/path',
    });
    const notModifiedUri = overrideUri(uri);
    expect(notModifiedUri).toEqual(uri);
  });

  test('Should return modified uri with correct machine name in uri scheme', () => {
    process.env.CHE_PROJECTS_ROOT = '/projects';
    process.env.CHE_MACHINE_NAME = 'testMachine';

    const uri = URI.from({
      scheme: 'file',
      path: '/path',
    });
    const expectedUri = URI.from({
      scheme: 'file-sidecar-testMachine',
      path: '/path',
    });
    const modifiedUri = overrideUri(uri);
    expect(expectedUri).toEqual(modifiedUri);
  });

  test('Should return the same uri if path is the same as project ones', () => {
    process.env.CHE_PROJECTS_ROOT = '/projects';
    process.env.CHE_MACHINE_NAME = 'testMachine';

    const uri = URI.from({
      scheme: 'file',
      path: '/projects/foo/bar',
    });
    const notModifiedUri = overrideUri(uri);
    expect(notModifiedUri).toEqual(uri);
  });
});
