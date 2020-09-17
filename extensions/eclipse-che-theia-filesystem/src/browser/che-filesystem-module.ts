/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { ContainerModule } from 'inversify';
import { LabelProvider, ConfirmDialog } from '@theia/core/lib/browser';
import { FileShouldOverwrite, FileStat } from '@theia/filesystem/lib/common/filesystem';
import URI from '@theia/core/lib/common/uri';

export default new ContainerModule((bind, unbind, isBound, rebind) => {
    rebind(FileShouldOverwrite).toDynamicValue(context => async (file: FileStat, stat: FileStat): Promise<boolean> => {
        if (Math.abs(file.lastModification - stat.lastModification) <= 1) {
            return true;
        }

        const labelProvider = context.container.get(LabelProvider);
        const dialog = new ConfirmDialog({
            title: `The file '${labelProvider.getName(new URI(file.uri))}' has been changed on the file system.`,
            msg: `Do you want to overwrite the changes made to '${labelProvider.getLongName(new URI(file.uri))}' on the file system?`,
            ok: 'Yes',
            cancel: 'No'
        });
        return !!await dialog.open();
    }).inSingletonScope();
});
