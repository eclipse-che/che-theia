/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { SSHAgentConfig } from '../agent/ssh-agent';

export const SSHPlugin = Symbol('SSHPlugin');

export interface SSHPlugin {
  configureSSH(gitHubActions: boolean): Promise<boolean>;
  addKeyToGitHub(): Promise<boolean>;
  sshAgentConfig(): Promise<SSHAgentConfig>;
}
