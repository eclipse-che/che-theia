/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { SpawnOptionsWithoutStdio, spawn } from 'child_process';

import { askpassEnv } from './askpass';

export async function execute(
  commandLine: string,
  args?: ReadonlyArray<string>,
  options?: SpawnOptionsWithoutStdio
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    if (options && askpassEnv) {
      options.env = mergeProcessEnv(options.env);
    }
    const command = spawn(commandLine, args, options);
    let result = '';
    let error = '';
    if (command.stdout) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      command.stdout.on('data', (data: any) => {
        result += data.toString();
      });
    }
    if (command.stderr) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      command.stderr.on('data', (data: any) => {
        error += data.toString();
        console.error(`Child process ${commandLine} stderr: ${data}`);
      });
    }
    command.on('close', (code: number | null) => {
      // eslint-disable-next-line no-null/no-null
      code = code === null ? 0 : code;
      const message = `Child process "${commandLine}" exited with code ${code}`;
      if (code === 0) {
        resolve(result.trim());
        console.log(message);
      } else {
        reject(new Error(error.length > 0 ? error : message));
        console.error(message);
      }
    });
  });
}

function mergeProcessEnv(env: NodeJS.ProcessEnv | undefined): NodeJS.ProcessEnv | undefined {
  if (!env) {
    env = {};
  }
  env.GIT_ASKPASS = askpassEnv.GIT_ASKPASS;
  if (askpassEnv.CHE_THEIA_GIT_ASKPASS_NODE) {
    env.CHE_THEIA_GIT_ASKPASS_NODE = askpassEnv.CHE_THEIA_GIT_ASKPASS_NODE;
  }
  if (askpassEnv.CHE_THEIA_GIT_ASKPASS_MAIN) {
    env.CHE_THEIA_GIT_ASKPASS_MAIN = askpassEnv.CHE_THEIA_GIT_ASKPASS_MAIN;
  }
  if (askpassEnv.CHE_THEIA_GIT_ASKPASS_HANDLE) {
    env.CHE_THEIA_GIT_ASKPASS_HANDLE = askpassEnv.CHE_THEIA_GIT_ASKPASS_HANDLE;
  }
  return env;
}
