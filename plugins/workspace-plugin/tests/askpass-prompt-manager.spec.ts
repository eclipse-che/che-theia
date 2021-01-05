/**********************************************************************
 * Copyright (c) 2019-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import 'jest';

import { PromptManager } from '../src/askpass-prompt-manager';

describe('testing async prompt request', () => {
  let num: number;
  let promptManager: PromptManager;

  beforeEach(() => {
    num = 0;
    promptManager = new PromptManager(
      (host: string, placeHolder: string) =>
        new Promise(resolve => {
          setTimeout(resolve, Math.floor(Math.random() * 500));
          num += parseInt(placeHolder);
          resolve('hello ' + num);
        })
    );
  });

  test('the prompt promise should be executed in sequence in the call order', async () => {
    const askpass1promise = promptManager.askPass('host', '1');
    const askpass2promise = promptManager.askPass('host', '2');
    expect(await askpass2promise).toBe('hello 3');
    expect(await askpass1promise).toBe('hello 1');
  });

  test('a prompt with the same host and placeHolder should return the same value and not be executed twice', async () => {
    const askpass1promise = promptManager.askPass('host', '1');
    const askpass2promise = promptManager.askPass('host', '2');
    const askpass3promise = promptManager.askPass('host', '1');
    const askpass4promise = promptManager.askPass('host2', '1');

    expect(await askpass2promise).toBe('hello 3');
    expect(await askpass4promise).toBe('hello 4');
    expect(await askpass1promise).toBe('hello 1');
    expect(await askpass3promise).toBe('hello 1');
  });
});
