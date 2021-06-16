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

import * as che from '@eclipse-che/plugin';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as theia from '@theia/plugin';

import { ChePluginRegistry } from '../../src/registry/che-plugin-registry';
import { Container } from 'inversify';
import { FeaturedFetcher } from '../../src/fetch/featured-fetcher';

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
    (che as any).__clearHttpMocks();
    container.bind(ChePluginRegistry).toConstantValue(chePluginRegistry);
    container.bind(FeaturedFetcher).toSelf().inSingletonScope();
  });

  test('get featured', async () => {
    const json = await fs.readFile(path.join(__dirname, '..', '_data', 'fetch', 'featured.json'), 'utf8');
    (che as any).__setHttpContent('https://my.registry/v3/che-theia/featured.json', json);

    const featuredFetcher = container.get(FeaturedFetcher);
    const featuredList = await featuredFetcher.fetch();
    expect(featuredList).toBeDefined();
    expect(featuredList.length).toBe(3);

    expect(che.http.get).toBeCalledWith(`${fakeUrl}/che-theia/featured.json`);
  });

  test('failure', async () => {
    (che as any).__setHttpContentError('https://my.registry/v3/che-theia/featured.json', 'invalid json');

    const featuredFetcher = container.get(FeaturedFetcher);
    const featuredList = await featuredFetcher.fetch();
    // no content
    expect(featuredList).toBeDefined();
    expect(featuredList.length).toBe(0);
    expect(che.http.get).toBeCalledWith(`${fakeUrl}/che-theia/featured.json`);
  });

  test('unexpected error', async () => {
    const error = {
      response: {
        status: 500,
      },
    };
    (che as any).__setHttpContentError('https://my.registry/v3/che-theia/recommendations/language/java.json', error);

    const featuredFetcher = container.get(FeaturedFetcher);
    const featuredList = await featuredFetcher.fetch();
    // no content
    expect(featuredList).toBeDefined();
    expect(featuredList.length).toBe(0);
    // notify the user
    expect(theia.window.showErrorMessage as jest.Mock).toBeCalled();
  });
});
