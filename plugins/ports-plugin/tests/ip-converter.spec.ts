/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { IpConverter } from '../src/ip-converter';

describe('Test IP Converter', () => {
  test('test ipv4', async () => {
    const ipConverter = new IpConverter();
    const result = ipConverter.convert('0100007F');
    expect(result).toBe('127.0.0.1');
  });

  test('test ipv6 1 ', async () => {
    const ipConverter = new IpConverter();
    const result = ipConverter.convert('B80D01200000000067452301EFCDAB89');
    expect(result).toBe('2001:db8::123:4567:89ab:cdef');
  });

  test('test ipv6 2', async () => {
    const ipConverter = new IpConverter();
    const result = ipConverter.convert('00000000000000000000000001000000');
    expect(result).toBe('::1');
  });
});
