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

import * as fs from 'fs-extra';
import * as path from 'path';

import { ChePluginRegistry } from '../../src/registry/che-plugin-registry';
import { Container } from 'inversify';
import { FeaturedFetcher } from '../../src/fetch/featured-fetcher';
import axios from 'axios';

// import AxiosInstance from 'axios';
describe('Test FeaturedFetcher', () => {
  let container: Container;

  const chePluginRegistryGetUrlMock = jest.fn();
  const chePluginRegistry = {
    getUrl: chePluginRegistryGetUrlMock,
  } as any;
  const fakeUrl = 'https://my.registry/v3';
  chePluginRegistryGetUrlMock.mockResolvedValue(fakeUrl);

  beforeEach(() => {
    container = new Container();
    jest.mock('axios');
    container.bind(ChePluginRegistry).toConstantValue(chePluginRegistry);
    container.bind(FeaturedFetcher).toSelf().inSingletonScope();
  });

  test('get featured', async () => {
    const json = await fs.readFile(path.join(__dirname, '..', '_data', 'fetch', 'featured.json'), 'utf8');
    (axios as any).__setContent('https://my.registry/v3/che-theia/featured.json', JSON.parse(json));

    const featuredFetcher = container.get(FeaturedFetcher);
    const featuredList = await featuredFetcher.fetch();
    expect(featuredList).toBeDefined();
    expect(featuredList.length).toBe(3);

    expect((axios as any).get).toBeCalledWith(`${fakeUrl}/che-theia/featured.json`);
  });

  test('failure', async () => {
    (axios as any).__setError('https://my.registry/v3/che-theia/featured.json', 'invalid json');

    const featuredFetcher = container.get(FeaturedFetcher);
    const featuredList = await featuredFetcher.fetch();
    // no content
    expect(featuredList).toBeDefined();
    expect(featuredList.length).toBe(0);
    expect((axios as any).get).toBeCalledWith(`${fakeUrl}/che-theia/featured.json`);
  });
});
