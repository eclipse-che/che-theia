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

import { CertificateService } from '@eclipse-che/theia-remote-api/lib/common/certificate-service';
import { Container } from 'inversify';
import { HttpService } from '@eclipse-che/theia-remote-api/lib/common/http-service';
import { K8SHttpServiceImpl } from '../../src/node/k8s-http-service-impl';
import axios from 'axios';

describe('Test K8sHttpServiceImpl', () => {
  let container: Container;

  let k8SHttpServiceImpl: HttpService;
  jest.mock('axios');

  const k8sCertificateServiceGetCertificateAuthorityMethod = jest.fn();
  const k8sCertificateServiceMock = {
    getCertificateAuthority: k8sCertificateServiceGetCertificateAuthorityMethod,
  } as any;

  const existingEnv = process.env;
  let currentEnv: any;
  beforeEach(async () => {
    (axios as any).__clearMock();
    (axios.create as jest.Mock).mockClear();
    currentEnv = {};
    process.env = currentEnv;
    k8sCertificateServiceGetCertificateAuthorityMethod.mockReset();
    container = new Container();
    container.bind(CertificateService).toConstantValue(k8sCertificateServiceMock);
    container.bind(K8SHttpServiceImpl).toSelf().inSingletonScope();
    k8SHttpServiceImpl = container.get(K8SHttpServiceImpl);
  });

  afterEach(async () => {
    process.env = existingEnv;
  });

  test('get internal', async () => {
    const uri = 'http://fake-url';
    const content = 'fake-content';
    (axios as any).__setContent(uri, content);
    const result = await k8SHttpServiceImpl.get(uri);
    expect(result).toBe(content);
  });

  test('get https', async () => {
    const uri = 'https://fake-url';
    const content = 'fake-content';
    const ca = 'hello';
    k8sCertificateServiceGetCertificateAuthorityMethod.mockResolvedValue(ca);
    const axiosCreateSpy = jest.spyOn(axios, 'create');
    (axios as any).__setContent(uri, content);
    const result = await k8SHttpServiceImpl.get(uri);

    expect(axiosCreateSpy).toBeCalled();
    expect(axiosCreateSpy.mock.calls[0][0]?.httpsAgent).toBeDefined();
    // can find the CA
    expect(axiosCreateSpy.mock.calls[0][0]?.httpsAgent?.options?.ca).toBe(ca);
    expect(result).toBe(content);
  });

  test('get proxy https', async () => {
    const uri = 'https://fake-url.com';
    const content = 'fake-content';
    const ca = 'hello';
    currentEnv.http_proxy = 'http://my.proxy';
    k8sCertificateServiceGetCertificateAuthorityMethod.mockResolvedValue(ca);
    const axiosCreateSpy = jest.spyOn(axios, 'create');
    (axios as any).__setContent(uri, content);
    const result = await k8SHttpServiceImpl.get(uri);

    expect(axiosCreateSpy).toBeCalled();
    expect(axiosCreateSpy.mock.calls[0][0]?.httpsAgent).toBeDefined();
    // can find the CA
    expect(axiosCreateSpy.mock.calls[0][0]?.httpsAgent?.options?.ca).toBe(ca);

    // can find the proxy
    expect(axiosCreateSpy.mock.calls[0][0]?.httpsAgent?.options?.proxy?.host).toBe('my.proxy');
    expect(axiosCreateSpy.mock.calls[0][0]?.httpsAgent?.options?.proxy?.port).toBe(0);

    expect(result).toBe(content);
  });

  test('get proxy http', async () => {
    const uri = 'http://fake-url.com';
    const content = 'fake-content';
    const ca = 'hello';
    currentEnv.http_proxy = 'http://my.proxy';
    k8sCertificateServiceGetCertificateAuthorityMethod.mockResolvedValue(ca);
    const axiosCreateSpy = jest.spyOn(axios, 'create');
    (axios as any).__setContent(uri, content);
    const result = await k8SHttpServiceImpl.get(uri);

    expect(axiosCreateSpy).toBeCalled();
    expect(axiosCreateSpy.mock.calls[0][0]?.httpsAgent).toBeUndefined();
    expect(axiosCreateSpy.mock.calls[0][0]?.httpAgent).toBeDefined();
    // no CA
    expect(axiosCreateSpy.mock.calls[0][0]?.httpAgent?.options?.ca).toBeUndefined();

    // can find the proxy
    expect(axiosCreateSpy.mock.calls[0][0]?.httpAgent?.options?.proxy?.host).toBe('my.proxy');
    expect(axiosCreateSpy.mock.calls[0][0]?.httpAgent?.options?.proxy?.port).toBe(0);

    expect(result).toBe(content);
  });

  test('get 404', async () => {
    const uri = 'http://fake-url';
    const error: any = new Error();
    error.response = { status: 404 };
    (axios as any).__setError(uri, error);
    const result = await k8SHttpServiceImpl.get(uri);
    expect(result).toBeUndefined();
  });

  test('get 500', async () => {
    const uri = 'http://fake-url1';
    const error: any = new Error();
    error.response = { status: 500 };
    (axios as any).__setError(uri, error);
    await expect(k8SHttpServiceImpl.get(uri)).rejects.toThrow(error);
  });
});
