/**********************************************************************
 * Copyright (c) 2019-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/
import { Mutex } from 'async-mutex';

export class PromptManager {
  private askPassResults: Map<Symbol, string> = new Map();
  private mutex: Mutex = new Mutex();

  constructor(promptLauncher: (host: string, placeHolder: string) => PromiseLike<string | undefined>) {
    this.askPassPromptLauncher = promptLauncher;
  }

  async askPass(host: string, placeHolder: string): Promise<string> {
    const release = await this.mutex.acquire();
    try {
      const key = getKey(host, placeHolder);
      if (this.askPassResults.has(key)) {
        return this.askPassResults.get(key) || '';
      }
      const result = (await this.askPassPromptLauncher(host, placeHolder)) || '';
      this.askPassResults.set(key, result);
      return result;
    } finally {
      release();
    }
  }

  askPassPromptLauncher: (host: string, placeHolder: string) => PromiseLike<string | undefined>;
}

function getKey(host: string, placeHolder: string) {
  return Symbol.for(`key[${host}:${placeHolder}]`);
}
