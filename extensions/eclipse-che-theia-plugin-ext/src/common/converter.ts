/********************************************************************************
 * Copyright (C) 2020 Red Hat, Inc. and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/
import * as che from '@eclipse-che/plugin';
import * as theia from '@theia/task/lib/common';

export function fromTaskInfo(info: che.TaskInfo): theia.TaskInfo {
    return {
        ...info,
        config: fromTaskConfig(info.config)
    };
}

export function fromTaskConfig(config: che.TaskConfiguration): theia.TaskConfiguration {
    return {
        ...config,
        _scope: typeof config._scope === 'string' ? config._scope : theia.TaskScope.Global
    };
}

export function toTaskInfo(info: theia.TaskInfo): che.TaskInfo {
    return {
        ...info,
        config: toTaskConfig(info.config)
    };
}

export function toTaskConfig(config: theia.TaskConfiguration): che.TaskConfiguration {
    return {
        ...config,
        _scope: typeof config._scope === 'string' ? config._scope : undefined
    };
}

export function toTaskExitedEvent(event: theia.TaskExitedEvent): che.TaskExitedEvent {
    return {
        event,
        config: event.config ? toTaskConfig(event.config) : undefined
    };
}
