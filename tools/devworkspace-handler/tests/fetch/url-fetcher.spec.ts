/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/
/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';

import { Container } from 'inversify';
import { UrlFetcher } from '../../src/fetch/url-fetcher';

class Custom404Error extends Error {
  public response = {
    status: 404,
  };
}

class Custom500Error extends Error {
  public response = {
    status: 500,
  };
}

describe('Test UrlFetcher', () => {
  let container: Container;

  const axiosGetMock = jest.fn();
  const axiosMock = {
    get: axiosGetMock,
  } as any;

  let urlFetcher: UrlFetcher;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    container = new Container();
    container.bind(UrlFetcher).toSelf().inSingletonScope();
    container.bind(Symbol.for('AxiosInstance')).toConstantValue(axiosMock);
    urlFetcher = container.get(UrlFetcher);
  });

  test('basic fetchTextOptionalContent', async () => {
    const content = 'abcd';
    axiosGetMock.mockResolvedValue({ data: content });
    const value = await urlFetcher.fetchTextOptionalContent('http://fake-entry');
    expect(axiosGetMock).toBeCalledWith('http://fake-entry', { responseType: 'text' });
    expect(value).toBe(content);
  });

  test('basic 404 error empty fetchTextOptionalContent', async () => {
    axiosGetMock.mockImplementation(() => Promise.reject(new Custom404Error()));
    const value = await urlFetcher.fetchTextOptionalContent('http://fake-entry');
    expect(axiosGetMock).toBeCalledWith('http://fake-entry', { responseType: 'text' });
    expect(value).toBeUndefined();
  });

  test('basic 500 error empty fetchTextOptionalContent', async () => {
    axiosGetMock.mockImplementation(() => Promise.reject(new Custom500Error()));
    await expect(urlFetcher.fetchTextOptionalContent('http://fake-entry')).rejects.toThrow();
    expect(axiosGetMock).toBeCalledWith('http://fake-entry', { responseType: 'text' });
  });

  test('basic fetchText', async () => {
    const content = 'abcd';
    axiosGetMock.mockResolvedValue({ data: content });
    const value = await urlFetcher.fetchText('http://fake-entry');
    expect(axiosGetMock).toBeCalledWith('http://fake-entry', { responseType: 'text' });
    expect(value).toBe(content);
  });
});
