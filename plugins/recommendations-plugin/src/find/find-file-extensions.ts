/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/
import * as theia from '@theia/plugin';

import { injectable } from 'inversify';

@injectable()
export class FindFileExtensions {
  public static readonly DEFAULT_SCAN_TIME_PER_WORKSPACE_FOLDER: number = 3000;

  async find(timeout: number = FindFileExtensions.DEFAULT_SCAN_TIME_PER_WORKSPACE_FOLDER): Promise<string[]> {
    const cancellationTokenSource = new theia.CancellationTokenSource();

    setTimeout(() => {
      cancellationTokenSource.cancel();
    }, timeout);

    const uris = await theia.workspace.findFiles('**/*', undefined, undefined, cancellationTokenSource.token);
    const fileExtensions: string[] = [];
    uris.forEach(uri => {
      const fileExtension = uri.fsPath.slice(((uri.fsPath.lastIndexOf('.') - 1) >>> 0) + 1);
      if (fileExtension.length > 0 && !fileExtensions.includes(fileExtension)) {
        fileExtensions.push(fileExtension);
      }
    });
    return fileExtensions;
  }
}
