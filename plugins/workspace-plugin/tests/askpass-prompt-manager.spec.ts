/**********************************************************************
 * Copyright (c) 2019-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { PromptManager } from '../src/askpass/askpass-prompt-manager';

describe('testing async prompt request', () => {
  let iteration: number;
  let promptManager: PromptManager;

  beforeEach(() => {
    iteration = 0;
    promptManager = new PromptManager(
      // host: string, placeHolder: string
      // request - is a message inside text box
      // prompt - it's a message under the text box
      (request: string, prompt: string) =>
        new Promise(resolve => {
          iteration += 1;
          setTimeout(resolve, Math.floor(Math.random() * 500) + 1000);
          console.log(`requested ${request} for ${prompt} iteration: ${iteration}`);
          resolve(`requested ${request} for ${prompt} - iteration: ${iteration}`);
        })
    );
  });

  test('the prompt promise should be executed in sequence in the call order', async () => {
    const askpass1promise = promptManager.askPass('username', 'host');
    const askpass2promise = promptManager.askPass('password', 'host');
    expect(await askpass1promise).toBe('requested username for host - iteration: 1');
    expect(await askpass2promise).toBe('requested password for host - iteration: 2');
  });

  test('a prompt with the same host and placeHolder should return the same value and not be executed twice', async () => {
    const askpass1promise = promptManager.askPass('username', 'host');
    const askpass2promise = promptManager.askPass('password', 'host');
    const askpass1promise_bis = promptManager.askPass('username', 'host');
    const askpass3promise = promptManager.askPass('username', 'host2');
    const askpass4promise = promptManager.askPass('password', 'host2');
    const askpass3promise_bis = promptManager.askPass('username', 'host2');

    expect(await askpass2promise).toBe('requested password for host - iteration: 2');
    expect(await askpass3promise).toBe('requested username for host2 - iteration: 3');
    expect(await askpass1promise).toBe('requested username for host - iteration: 1');
    expect(await askpass1promise_bis).toBe('requested username for host - iteration: 1');
    expect(await askpass4promise).toBe('requested password for host2 - iteration: 4');
    expect(await askpass3promise_bis).toBe('requested username for host2 - iteration: 3');
  });
});
