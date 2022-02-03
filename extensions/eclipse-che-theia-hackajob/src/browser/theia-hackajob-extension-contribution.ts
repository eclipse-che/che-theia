/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import '../../src/browser/style/pulse.css';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/themes/light.css';

import { CommandService, MessageService } from '@theia/core';
import { FrontendApplication, FrontendApplicationContribution } from '@theia/core/lib/browser';
import { inject, injectable } from 'inversify';

import { MaybePromise } from '@theia/core/lib/common/types';
import { Widget } from '@theia/core/lib/browser/widgets';
// @ts-ignore
import tippy from 'tippy.js';

@injectable()
export class TheiaHackajobExtensionContribution implements FrontendApplicationContribution {
  @inject(MessageService)
  protected readonly messageService: MessageService;

  @inject(CommandService)
  protected readonly commandService: CommandService;

  onDidInitializeLayout(app: FrontendApplication): MaybePromise<void> {
    this.messageService.info(
      'Application is compiling and starting, after completion you will see a question if you want to open ' +
        'the browser with the application in the IDE. In the meantime you can open the Tasks section from the left side and see the logs.'
    );

    // Remove unused widgets
    app.shell.widgets.forEach((widget: Widget) => {
      if (['scm-view-container', 'scm-view', 'outline-view'].includes(widget.id)) {
        widget.dispose();
      }
    });

    setTimeout(() => {
      const noOfMaximumRetries = 100;
      const noOfRetriesBrowserWarning = 80;
      const noOfWidgetsToFind = 3;
      let noOfRetries = 0;
      let noOfWidgetsFound = 0;
      const widgetsFound: string[] = [];
      const intervalIdx = setInterval(() => {
        console.log('[h] hackajob checking ...');
        app.shell.widgets.forEach((widget: Widget) => {
          const pulseNode = document.createElement('div');
          pulseNode.classList.add('pulse');

          if (
            document.getElementById('shell-tab-plugin-view-container:endpoints') &&
            !widgetsFound.includes(widget.id) &&
            widget.isAttached &&
            widget.id === 'plugin-view:endpoints'
          ) {
            console.log('[h] Widget found: ' + widget.id);
            widgetsFound.push(widget.id);
            noOfWidgetsFound++;

            const tasksItem = document.getElementById('shell-tab-plugin-view-container:endpoints');
            if (tasksItem) {
              tasksItem.classList.add('relative');
              tasksItem.appendChild(pulseNode);
              tasksItem.addEventListener('click', () => {
                const pulseNodeToDelete = tasksItem.getElementsByClassName('pulse')[0];
                if (pulseNodeToDelete) {
                  tasksItem.removeChild(pulseNodeToDelete);
                }
              });

              tippy('.plugin-view-container-icon-endpoints', {
                content: 'Available Endpoints',
                placement: 'left',
                theme: 'light',
              });
            }
          }

          if (
            document.getElementById('shell-tab-plugin-view-container:my-workspace') &&
            !widgetsFound.includes(widget.id) &&
            widget.isAttached &&
            widget.id === 'plugin-view:workspace'
          ) {
            console.log('[h] Widget found: ' + widget.id);
            widgetsFound.push(widget.id);
            noOfWidgetsFound++;

            const endpointsItem = document.getElementById('shell-tab-plugin-view-container:my-workspace');
            if (endpointsItem) {
              endpointsItem.classList.add('relative');
              endpointsItem.appendChild(pulseNode);
              endpointsItem.addEventListener('click', () => {
                const pulseNodeToDelete = endpointsItem.getElementsByClassName('pulse')[0];
                if (pulseNodeToDelete) {
                  endpointsItem.removeChild(pulseNodeToDelete);
                }
              });

              tippy('.plugin-view-container-icon-my-workspace', {
                content: 'Available Commands',
                placement: 'left',
                theme: 'light',
              });
            }
          }

          if (
            document.getElementById('shell-tab-mini-browser:__minibrowser__preview__:/') &&
            !widgetsFound.includes(widget.id) &&
            widget.isAttached &&
            widget.id === 'mini-browser:__minibrowser__preview__:/'
          ) {
            console.log('[h] Widget found: ' + widget.id);
            widgetsFound.push(widget.id);
            noOfWidgetsFound++;

            const browserItem = document.getElementById('shell-tab-mini-browser:__minibrowser__preview__:/');
            if (browserItem) {
              browserItem.classList.add('relative');
              browserItem.appendChild(pulseNode);
              browserItem.addEventListener('click', () => {
                const pulseNodeToDelete = browserItem.getElementsByClassName('pulse')[0];
                if (pulseNodeToDelete) {
                  browserItem.removeChild(pulseNodeToDelete);
                }
              });

              tippy('.theia-mini-browser-icon', {
                content: 'Your application',
                placement: 'left',
                theme: 'light',
              });
            }
          }

          if (noOfWidgetsFound === noOfWidgetsToFind || noOfMaximumRetries === noOfRetries) {
            clearInterval(intervalIdx);
          }

          if (noOfRetriesBrowserWarning === noOfRetries) {
            this.messageService.info(
              "Are you sure you don't want to preview the application? Click first item on the right side bar to see all the available URLs."
            );
          }

          noOfRetries++;
        });
      }, 10000);
    }, 5000);
  }
}
