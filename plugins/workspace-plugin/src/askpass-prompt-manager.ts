/**********************************************************************
 * Copyright (c) 2019-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

export class PromptManager {
  private askPassResults: Map<HostPlaceHolderKey, PromiseLike<string | undefined>> = new Map();

  constructor(promptLauncher: (host: string, placeHolder: string) => PromiseLike<string | undefined>) {
    this.askPassPromptLauncher = promptLauncher;
  }

  async askPass(host: string, placeHolder: string): Promise<string> {
    let existingPromise: PromiseLike<string | undefined> | undefined;

    // wait for all promises to be finished sequencially
    this.askPassResults.forEach(async (promise, key) => {
      if (key.host === host && key.placeHolder === placeHolder) {
        existingPromise = promise;
      }
      await promise;
    });

    if (existingPromise) {
      return (await existingPromise) || '';
    }

    const askPassPromise = this.askPassPromptLauncher(host, placeHolder);
    this.askPassResults.set({ host: host, placeHolder: placeHolder }, askPassPromise);
    return (await askPassPromise) || '';
  }

  askPassPromptLauncher: (host: string, placeHolder: string) => PromiseLike<string | undefined>;
}

class HostPlaceHolderKey {
  host: string;
  placeHolder: string;
}
