/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as escape_html from 'escape-html';
import * as express from 'express';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { FileType, Stat } from '@theia/filesystem/lib/common/files';

import { HostedPluginReader } from '@theia/plugin-ext/lib/hosted/node/plugin-reader';
import { HostedPluginRemote } from './hosted-plugin-remote';
import { injectable } from 'inversify';
import { promisify } from 'util';

/**
 * Patches original plugin reader to be able to retrieve remote plugin resources.
 */
@injectable()
export class PluginReaderExtension extends HostedPluginReader {
  // To be set on connection creation
  // If there are more than one cnnection, the last one will be used.
  private hostedPluginRemote: HostedPluginRemote;

  setRemotePluginConnection(hostedPluginRemote: HostedPluginRemote): void {
    this.hostedPluginRemote = hostedPluginRemote;
  }

  configure(app: express.Application): void {
    app.get('/hostedPlugin/:pluginId/:path(*)', async (req, res) => {
      const pluginId = req.params.pluginId;

      const localPath = this.pluginsIdsFiles.get(pluginId);
      if (localPath) {
        const filePath = path.resolve(localPath, req.params.path);
        if (req.params.request === 'stat') {
          try {
            const stats = await promisify(fs.lstat)(filePath);
            const stat: Stat = {
              type: stats.isFile() ? FileType.File : FileType.Directory,
              ctime: stats.birthtime.getTime(),
              mtime: stats.mtime.getTime(),
              size: stats.size,
            };
            res.send(stat);
          } catch (e) {
            if (e && e.errno) {
              if (e.errno === os.constants.errno.ENOENT) {
                res.status(404).send(`No such file found in '${escape_html(pluginId)}' plugin.`);
              } else {
                res.status(500).send(`Failed to transfer a file from '${escape_html(pluginId)}' plugin.`);
              }
            }
          }
        } else {
          res.sendFile(filePath, e => {
            if (!e) {
              // the file was found and successfully transferred
              return;
            }
            console.error(`Could not transfer '${filePath}' file from '${pluginId}'`, e);
            if (res.headersSent) {
              // the request was already closed
              return;
            }
            if ('code' in e && e['code'] === 'ENOENT') {
              res.status(404).send(`No such file found in '${escape_html(pluginId)}' plugin.`);
            } else {
              res.status(500).send(`Failed to transfer a file from '${escape_html(pluginId)}' plugin.`);
            }
          });
        }
      } else {
        await this.handleMissingResource(req, res);
      }
    });
  }

  // Handles retrieving of remote resource for plugins.
  async handleMissingResource(req: express.Request, res: express.Response): Promise<void> {
    const pluginId = req.params.pluginId;
    if (this.hostedPluginRemote) {
      const resourcePath = req.params.path;
      try {
        const resource = await this.hostedPluginRemote.requestPluginResource(pluginId, resourcePath);
        if (resource) {
          res.type(path.extname(resourcePath));
          res.send(resource);
          return;
        }
      } catch (e) {
        console.error('Failed to get plugin resource from sidecar. Error:', e);
      }
    }

    res.status(404).send(`The plugin with id '${escape_html(pluginId)}' does not exist.`);
  }

  // Exposes paths of plugin resources for other components.
  public getPluginRootDirectory(pluginId: string): string | undefined {
    return this.pluginsIdsFiles.get(pluginId);
  }
}
