/**********************************************************************
 * Copyright (c) 2019-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { PromptManager } from '../src/askpass-prompt-manager';

describe('testing async prompt request', () => {
  let iteration: number;
  let promptManager: PromptManager;

  beforeEach(() => {
    iteration = 0;
    promptManager = new PromptManager(
      (host: string, placeHolder: string) =>
        new Promise(resolve => {
          iteration += 1;
          setTimeout(resolve, Math.floor(Math.random() * 500) + 1000);
          console.log(`resolving ${host} ${placeHolder} iteration: ${iteration}`);
          resolve(`hello ${host} ${placeHolder} - iteration: ${iteration}`);
        })
    );
  });

  test('the prompt promise should be executed in sequence in the call order', async () => {
    const askpass1promise = promptManager.askPass('host', 'username');
    const askpass2promise = promptManager.askPass('host', 'password');
    expect(await askpass2promise).toBe('hello host password - iteration: 2');
    expect(await askpass1promise).toBe('hello host username - iteration: 1');
  });

  test('a prompt with the same host and placeHolder should return the same value and not be executed twice', async () => {
    const askpass1promise = promptManager.askPass('host', 'username');
    const askpass2promise = promptManager.askPass('host', 'password');
    const askpass1promise_bis = promptManager.askPass('host', 'username');
    const askpass3promise = promptManager.askPass('host2', 'username');
    const askpass4promise = promptManager.askPass('host2', 'password');
    const askpass3promise_bis = promptManager.askPass('host2', 'username');

    expect(await askpass2promise).toBe('hello host password - iteration: 2');
    expect(await askpass3promise).toBe('hello host2 username - iteration: 3');
    expect(await askpass1promise).toBe('hello host username - iteration: 1');
    expect(await askpass1promise_bis).toBe('hello host username - iteration: 1');
    expect(await askpass4promise).toBe('hello host2 password - iteration: 4');
    expect(await askpass3promise_bis).toBe('hello host2 username - iteration: 3');
  });
});
