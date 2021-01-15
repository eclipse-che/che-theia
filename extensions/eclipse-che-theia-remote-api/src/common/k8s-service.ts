/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

export const cheK8SServicePath = '/sevices/che-k8s-service';
export const CheK8SService = Symbol('CheK8SService');

export interface K8SRawResponse {
  statusCode: number;
  data: string;
  error: string;
}

export interface CheK8SService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendRawQuery(requestURL: string, opts: any): Promise<K8SRawResponse>;
}
