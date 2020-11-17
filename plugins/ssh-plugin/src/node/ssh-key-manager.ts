/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as che from '@eclipse-che/plugin';

import { che as cheApi } from '@eclipse-che/api';

/**
 * Simple SSH key pairs manager that performs basic operations like create,
 * get, delete, etc. There is no restriction on the way the keys are obtained -
 * remotely (via REST or JSON-RPC, ) or locally (e.g. dynamically generated
 * and/or in-memory stored), so the implementation of the interface defines
 * the mechanism that is used.
 */
export interface SshKeyManager {
  /**
   * Generate an SSH key pair for specified service and name
   *
   * @param {string} service the name of the service that is associated with
   * the SSH key pair
   * @param {string} name the identifier of the key pair
   *
   * @returns {Promise<SshKeyPair>}
   */
  generate(service: string, name: string): Promise<cheApi.ssh.SshPair>;

  /**
   * Create a specified SSH key pair
   *
   * @param {SshKeyPair} sshKeyPair the SSH key pair that is to be created
   *
   * @returns {Promise<void>}
   */
  create(sshKeyPair: cheApi.ssh.SshPair): Promise<void>;

  /**
   * Get all SSH key pairs associated with specified service
   *
   * @param {string} service the name of the service that is associated with
   * the SSH key pair
   *
   * @returns {Promise<cheApi.ssh.SshPair[]>}
   */
  getAll(service: string): Promise<cheApi.ssh.SshPair[]>;

  /**
   * Get an SSH key pair associated with specified service and name
   *
   * @param {string} service the name of the service that is associated with
   * the SSH key pair
   * @param {string} name the identifier of the key pair
   *
   * @returns {Promise<cheApi.ssh.SshPair>}
   */
  get(service: string, name: string): Promise<cheApi.ssh.SshPair>;

  /**
   * Delete an SSH key pair with a specified service and name
   *
   * @param {string} service the name of the service that is associated with
   * the SSH key pair
   * @param {string} name the identifier of the key pair
   *
   * @returns {Promise<void>}
   */
  delete(service: string, name: string): Promise<void>;
}

export interface CheService {
  name: string;
  displayName: string;
  description: string;
}

/**
 * A remote SSH key paris manager that uses {@link SshKeyServiceClient} for
 * all SHH key related operations.
 */
export class RemoteSshKeyManager implements SshKeyManager {
  /**
   * @inheritDoc
   */
  generate(service: string, name: string): Promise<cheApi.ssh.SshPair> {
    return che.ssh.generate(service, name);
  }

  /**
   * @inheritDoc
   */
  create(sshKeyPair: cheApi.ssh.SshPair): Promise<void> {
    return che.ssh.create(sshKeyPair);
  }

  /**
   * @inheritDoc
   */
  getAll(service: string): Promise<cheApi.ssh.SshPair[]> {
    return che.ssh.getAll(service);
  }

  /**
   * @inheritDoc
   */
  get(service: string, name: string): Promise<cheApi.ssh.SshPair> {
    return che.ssh.get(service, name);
  }

  /**
   * @inheritDoc
   */
  delete(service: string, name: string): Promise<void> {
    return che.ssh.deleteKey(service, name);
  }
}
