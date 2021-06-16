/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

// @ts-ignore
import * as download from 'download';
import * as fs from 'fs-extra';
import * as handlerbars from 'handlebars';
import * as moment from 'moment';
import * as path from 'path';
import * as semver from 'semver';

import simpleGit, { SimpleGit } from 'simple-git';

const vsixInfo = require('vsix-info').default;

const ROOT_DIR = '/tmp/theia';

// Entry generated when inspecting an extension
export interface Entry {
  extensionName?: string;
  cheTheiaVersion?: string;
  theiaVersion?: string;
  needsUpdating?: boolean;
  errors: string[];
}

// Generate the report
export class Report {
  // log the error and cleanup clone folder
  async handleError(entry: Entry, error: string): Promise<Entry> {
    entry.errors.push(error);
    console.log(`❌ ${entry.extensionName} error:`, entry.errors);

    return entry;
  }

  async generate(): Promise<void> {
    const start = moment();

    // cleanup folder
    await fs.remove(ROOT_DIR);

    const cheTheiaExtensions = JSON.parse(
      await fs.readFile('./../../generator/src/templates/theiaPlugins.json', 'utf-8')
    );

    const git: SimpleGit = simpleGit();
    try {
      await git.clone('https://github.com/eclipse-theia/theia', ROOT_DIR);
    } catch (err) {
      return console.log('❌ Failed to clone theia repo:', err);
    }
    const theiaExtensions = JSON.parse(await fs.readFile(path.join(ROOT_DIR, 'package.json'), 'utf-8')).theiaPlugins;

    // grab result in parallel
    const entries: Entry[] = await Promise.all(
      Object.entries(cheTheiaExtensions).map(async ([name, location]): Promise<Entry> => {
        const entry: Entry = {
          extensionName: name,
          errors: [],
        };

        const extensionFile = `/tmp/${name}`;

        try {
          await fs.writeFile(extensionFile, await download(location));
        } catch (err) {
          return this.handleError(entry, `Error downloading/writing vsix file ${err}`);
        }

        try {
          entry.cheTheiaVersion = (await vsixInfo.getInfo(extensionFile)).version;
        } catch (err) {
          return this.handleError(entry, `Error scraping vsix data ${err}`);
        }
        // Remove che-theia vsix
        await fs.remove(extensionFile);

        // if the built-in exists in both package.json's, download the vsix and check it
        if (theiaExtensions[name]) {
          try {
            await fs.writeFile(extensionFile, await download(theiaExtensions[name]));
          } catch (err) {
            return this.handleError(entry, `Error downloading/writing vsix file ${err}`);
          }

          // get version information from theia vsix
          try {
            entry.theiaVersion = (await vsixInfo.getInfo(extensionFile)).version;
          } catch (err) {
            return this.handleError(entry, `Error scraping vsix data ${err}`);
          }
          // Remove theia vsix
          await fs.remove(extensionFile);

          if (!entry.theiaVersion) {
            entry.needsUpdating = false;
            return this.handleError(entry, 'Failure: there is no theia version');
          } else if (!entry.cheTheiaVersion) {
            entry.needsUpdating = false;
            return this.handleError(entry, 'Failure: there is no che-theia version');
          } else {
            entry.needsUpdating = semver.gt(entry.theiaVersion, entry.cheTheiaVersion);
          }
          entry.needsUpdating = semver.gt(entry.theiaVersion, entry.cheTheiaVersion);
        } else {
          return this.handleError(entry, `Failure: there is no theia built-in named *${name}*`);
        }
        return entry;
      })
    );

    // sort entries by extension name if present (and not by repository name)
    entries.sort((entry1, entry2) => {
      if (entry1.extensionName && entry2.extensionName) {
        return entry1.extensionName.localeCompare(entry2.extensionName);
      } else {
        return 0;
      }
    });

    // generate report
    const content = await fs.readFile(path.join(__dirname, '../src/check-extension-update-template.md'), 'utf8');
    const template: HandlebarsTemplateDelegate = handlerbars.compile(content);
    const env = {
      entries: entries,
      reportTime: moment.utc().format('YYYY-MM-DD HH:mm:ss'),
      computeTime: moment.duration(moment().diff(start)).as('seconds'),
    };
    const generatedReport = template(env);
    try {
      await fs.writeFile('./report/index.md', generatedReport);
    } catch (err) {
      console.log('Failed to write the report file (./report/index.md)');
    }

    return;
  }
}

(async (): Promise<void> => {
  await new Report().generate().catch((error: unknown) => {
    console.log('Error:', error);
  });
})();
