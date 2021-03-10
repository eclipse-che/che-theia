/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { convertToBytes, convertToMilliCPU } from '../src/units-converter';

describe('Test Convertor Utility', () => {
  describe('converToBytes', () => {
    test('undefined to 0', () => {
      expect(convertToBytes(undefined)).toBe(0);
    });
    test('mebibyte to bytes', () => {
      expect(convertToBytes('1Mi')).toBe(1048576);
      expect(convertToBytes('1MI')).toBe(1048576);
      expect(convertToBytes('1mi')).toBe(1048576);
    });
    test('kibibyte to bytes', () => {
      expect(convertToBytes('1Ki')).toBe(1024);
      expect(convertToBytes('1KI')).toBe(1024);
      expect(convertToBytes('1ki')).toBe(1024);
    });
    test('gibibyte to bytes', () => {
      expect(convertToBytes('1Gi')).toBe(1073741824);
      expect(convertToBytes('1GI')).toBe(1073741824);
      expect(convertToBytes('1gi')).toBe(1073741824);
    });
    test('megabyte to bytes', () => {
      expect(convertToBytes('1M')).toBe(1000000);
      expect(convertToBytes('1m')).toBe(1000000);
    });
    test('kilobyte to bytes', () => {
      expect(convertToBytes('1K')).toBe(1000);
      expect(convertToBytes('1k')).toBe(1000);
    });
    test('gigabyte to bytes', () => {
      expect(convertToBytes('1G')).toBe(1000000000);
      expect(convertToBytes('1g')).toBe(1000000000);
    });
  });
  describe('convertToMilliCPU', () => {
    test('undefined to 0', () => {
      expect(convertToMilliCPU(undefined)).toBe(0);
    });
    test('1m to 1', () => {
      expect(convertToMilliCPU('1m')).toBe(1);
      expect(convertToMilliCPU('1M')).toBe(1);
    });
    test('1 to milli', () => {
      expect(convertToMilliCPU('1')).toBe(1000);
    });
  });
});
