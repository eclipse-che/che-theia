/**********************************************************************
 * Copyright (c) 2019-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { AddKeyToGitHub } from './command/add-key-to-github';
import { Container } from 'inversify';
import { CreateKey } from './command/create-key';
import { DeleteKey } from './command/delete-key';
import { GenerateKey } from './command/generate-key';
import { GenerateKeyForHost } from './command/generate-key-for-host';
import { GitListener } from './git/git-listener';
import { SSHAgent } from './agent/ssh-agent';
import { SSHPlugin } from './ssh-plugin';
import { UploadPrivateKey } from './command/upload-private-key';
import { ViewPublicKey } from './command/view-public-key';

export function bindings(): Container {
  const container = new Container();

  container.bind(SSHPlugin).toSelf().inSingletonScope();
  container.bind(SSHAgent).toSelf().inSingletonScope();
  container.bind(GitListener).toSelf().inSingletonScope();
  container.bind(AddKeyToGitHub).toSelf().inSingletonScope();
  container.bind(CreateKey).toSelf().inSingletonScope();
  container.bind(DeleteKey).toSelf().inSingletonScope();
  container.bind(GenerateKey).toSelf().inSingletonScope();
  container.bind(GenerateKeyForHost).toSelf().inSingletonScope();
  container.bind(UploadPrivateKey).toSelf().inSingletonScope();
  container.bind(ViewPublicKey).toSelf().inSingletonScope();

  return container;
}
