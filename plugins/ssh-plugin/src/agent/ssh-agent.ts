/**********************************************************************
 * Copyright (c) 2019-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as fs from 'fs-extra';

import { injectable } from 'inversify';
import { output } from '../util/util';
import { spawn } from 'child_process';

export const SSH_AGENT_PID = 'SSH_AGENT_PID';
export const SSH_AUTH_SOCK = 'SSH_AUTH_SOCK';

export interface SSHAgentConfig {
  sshAgentPid?: string;
  sshAuthSock?: string;
}

@injectable()
export class SSHAgent {
  config: SSHAgentConfig = {};

  constructor() {}

  async start(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const command = spawn('ssh-agent', ['-s']);

      let agentOutput = '';

      command.stderr.on('data', async (data: string) => {
        reject(data);
      });

      command.stdout.on('data', async d => {
        agentOutput += d.toString();
      });

      command.on('close', async () => {
        this.parseAgentOutput(agentOutput);

        process.env[SSH_AGENT_PID] = this.config.sshAgentPid;
        process.env[SSH_AUTH_SOCK] = this.config.sshAuthSock;

        await this.updateBashrc();

        resolve();
      });
    });
  }

  parseAgentOutput(agentOutput: string): void {
    const outputs: string[] = agentOutput.split('\n');

    for (const out of outputs) {
      const value = out.substring(out.indexOf('=') + 1, out.indexOf(';'));

      if (out.startsWith(SSH_AGENT_PID)) {
        this.config.sshAgentPid = value;
      } else if (out.startsWith(SSH_AUTH_SOCK)) {
        this.config.sshAuthSock = value;
      }
    }
  }

  async updateBashrc(): Promise<void> {
    const bashrc = `${process.env['HOME']}/.bashrc`;

    try {
      await fs.ensureFile(bashrc);

      // appent at the end
      fs.appendFile(bashrc, `export ${SSH_AGENT_PID}=${this.config.sshAgentPid}\n`);
      fs.appendFile(bashrc, `export ${SSH_AUTH_SOCK}=${this.config.sshAuthSock}\n`);
    } catch (err) {
      output.appendLine(`Failure to update ${bashrc}`);
    }
  }
}
