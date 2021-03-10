/**********************************************************************
 * Copyright (c) 2019-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as theia from '@theia/plugin';

export const SSH_GENERATE_FOR_HOST: theia.CommandDescription = {
  id: 'ssh:generate_for_host',
  label: 'SSH: Generate Key For Particular Host...',
};

export const SSH_GENERATE: theia.CommandDescription = {
  id: 'ssh:generate',
  label: 'SSH: Generate Key...',
};

export const SSH_CREATE: theia.CommandDescription = {
  id: 'ssh:create',
  label: 'SSH: Create Key...',
};

export const SSH_DELETE: theia.CommandDescription = {
  id: 'ssh:delete',
  label: 'SSH: Delete Key...',
};

export const SSH_VIEW: theia.CommandDescription = {
  id: 'ssh:view',
  label: 'SSH: View Public Key...',
};

export const SSH_UPLOAD: theia.CommandDescription = {
  id: 'ssh:upload',
  label: 'SSH: Upload Private Key...',
};

export const SSH_ADD_TO_GITHUB: theia.CommandDescription = {
  id: 'ssh:add_key_to_github',
  label: 'SSH: Add Existing Key To GitHub...',
};
