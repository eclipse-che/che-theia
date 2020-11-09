/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

/**
 * Represent all languages used by VS Code extensions/Theia plugins installed in the current instance.
 */
export interface VSCodeExtensionsInstalledLanguages {
  // Map between file extension and language Id
  languagesByFileExtensions: Map<string, string[]>;

  // Map between a language Id and the VS Code extension Ids
  vscodeExtensionByLanguageId: Map<string, string[]>;
}
