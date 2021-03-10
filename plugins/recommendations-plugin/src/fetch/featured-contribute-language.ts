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
 * Contribution language subset as defined from https://code.visualstudio.com/api/references/contribution-points#language-example
 */
export interface FeaturedContributeLanguage {
  id: string;
  aliases: string[];
  /**
   * file extensions, for example ".py"
   */
  extensions: string[];
  filenames: string[];
}
