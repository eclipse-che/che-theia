/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import 'reflect-metadata';

import * as plugin from '../src/plugin';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Container } from 'inversify';
import { InversifyBinding } from '../src/inject/inversify-bindings';
import { RecommendationsPlugin } from '../src/plugin/recommendations-plugin';

describe('Test Plugin', () => {
  jest.mock('../src/inject/inversify-bindings');
  let oldBindings: any;
  let initBindings: jest.Mock;

  beforeEach(() => {
    oldBindings = InversifyBinding.prototype.initBindings;
    initBindings = jest.fn();
    InversifyBinding.prototype.initBindings = initBindings;
  });

  afterEach(() => {
    InversifyBinding.prototype.initBindings = oldBindings;
  });

  test('basics', async () => {
    const container = new Container();
    const morecommendationsPluginMock = { start: jest.fn(), stop: jest.fn() };
    container.bind(RecommendationsPlugin).toConstantValue(morecommendationsPluginMock as any);
    initBindings.mockReturnValue(container);

    plugin.start();
    expect(morecommendationsPluginMock.start).toBeCalled();
  });
});
