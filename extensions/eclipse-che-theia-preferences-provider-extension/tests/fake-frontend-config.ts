/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/
import { FrontendApplicationConfig } from '@theia/application-package/lib/application-props';
import { FrontendApplicationConfigProvider } from '@theia/core/lib/browser/frontend-application-config-provider';

/**
 * Fake app contrib
 */
const frontendAppConfig: FrontendApplicationConfig.Partial = {
  defaultTheme: 'dark',
  defaultIconTheme: 'dark',
  applicationName: 'tests',
};
FrontendApplicationConfigProvider.set(frontendAppConfig);
