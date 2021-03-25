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

  constructor(private readonly prompt: (request: string, prompt: string) => PromiseLike<string | undefined>) {}

  async askPass(request: string, prompt: string): Promise<string> {
    const release = await this.mutex.acquire();
    try {
      const key = getKey(request, prompt);
      if (this.askPassResults.has(key)) {
        return this.askPassResults.get(key) || '';
      }
      const result = (await this.prompt(request, prompt)) || '';
      this.askPassResults.set(key, result);
      return result;
    } finally {
      release();
    }
  }
}

function getKey(request: string, prompt: string) {
  return Symbol.for(`key[${request}:${prompt}]`);
}
