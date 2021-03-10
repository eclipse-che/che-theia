/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { Stat } from '@theia/filesystem/src/common/files';

/**
 * This file models messages that are exchanged between remote plugin
 * hosts and remote back ends (i.e. they are not forwarded tunnelled to/from
 * the browser)
 */

/**
 * An "internal" message is knwon by it's "internal" property
 */
export interface InternalMessage {
  internal: InternalMessagePayload;
}

export interface InternalMessagePayload {}

export namespace InternalMessage {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function is(msg: any): msg is InternalMessage {
    return msg.internal;
  }
}

export namespace InternalRequestResponsePayload {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function is(msg: any): msg is InternalRequestResponsePayload {
    return msg.requestId;
  }
}

export type InternalRequestResponsePayload = InternalMessagePayload & {
  requestId: string;
};

export namespace GetResourceRequest {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function is(msg: any): msg is GetResourceRequest {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return InternalRequestResponsePayload.is(msg) && (msg as any).method === 'getResource';
  }
}

export type GetResourceRequest = InternalRequestResponsePayload & {
  method: 'getResource';
  pluginId: string;
  path: string;
};

export type GetResourceResponse = InternalRequestResponsePayload & {
  data?: string;
};

export namespace GetResourceStatRequest {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function is(msg: any): msg is GetResourceStatRequest {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return InternalRequestResponsePayload.is(msg) && (msg as any).method === 'getResourceStat';
  }
}

export type GetResourceStatRequest = InternalRequestResponsePayload & {
  method: 'getResourceStat';
  pluginId: string;
  path: string;
};

export type GetResourceStatResponse = InternalRequestResponsePayload & {
  stat?: Stat;
};
