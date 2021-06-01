/**********************************************************************
 * Copyright (c) 2019-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as ssh from './ssh';

import { SpawnOptionsWithoutStdio, spawn } from 'child_process';

import { askpassEnv } from './askpass/askpass';

export async function execute(
  commandLine: string,
  args?: ReadonlyArray<string>,
  options?: SpawnOptionsWithoutStdio
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    if (options) {
      options.env = mergeProcessEnv(options.env);
    }

    const command = spawn(commandLine, args, withProxySettings(options));

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

  if (askpassEnv) {
    env.GIT_ASKPASS = askpassEnv.GIT_ASKPASS;
    env.SSH_ASKPASS = askpassEnv.SSH_ASKPASS;
    env.DISPLAY = askpassEnv.DISPLAY;

    if (askpassEnv.CHE_THEIA_GIT_ASKPASS_NODE) {
      env.CHE_THEIA_GIT_ASKPASS_NODE = askpassEnv.CHE_THEIA_GIT_ASKPASS_NODE;
    }
    if (askpassEnv.CHE_THEIA_GIT_ASKPASS_MAIN) {
      env.CHE_THEIA_GIT_ASKPASS_MAIN = askpassEnv.CHE_THEIA_GIT_ASKPASS_MAIN;
    }
    if (askpassEnv.CHE_THEIA_GIT_ASKPASS_HANDLE) {
      env.CHE_THEIA_GIT_ASKPASS_HANDLE = askpassEnv.CHE_THEIA_GIT_ASKPASS_HANDLE;
    }
  }

  if (ssh.config.sshAgentPid) {
    env.SSH_AGENT_PID = ssh.config.sshAgentPid;
  }

  if (ssh.config.sshAuthSock) {
    env.SSH_AUTH_SOCK = ssh.config.sshAuthSock;
  }

  return env;
}

function withProxySettings(options?: SpawnOptionsWithoutStdio): SpawnOptionsWithoutStdio {
  const HTTP_PROXY = 'http_proxy';
  const HTTPS_PROXY = 'https_proxy';
  const NO_PROXY = 'no_proxy';

  if (!options) {
    options = {};
  }

  if (!options.env) {
    options.env = {};
  }

  if (process.env[HTTP_PROXY]) {
    options.env.HTTP_PROXY = process.env[HTTP_PROXY];
  }

  if (process.env[HTTPS_PROXY]) {
    options.env.HTTPS_PROXY = process.env[HTTPS_PROXY];
  }

  if (process.env[NO_PROXY]) {
    options.env.NO_PROXY = process.env[NO_PROXY];
  }

  return options;
}
