#!/bin/sh
# Copyright (c) 2019 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#

set -e
set -x

# Ensure $HOME exists when starting
if [ ! -d "${HOME}" ]; then
    mkdir -p "${HOME}"
fi

# Add current (arbitrary) user to /etc/passwd
if ! whoami >/dev/null 2>&1; then
    if [ -w /etc/passwd ]; then
        echo "${USER_NAME:-user}:x:$(id -u):0:${USER_NAME:-user} user:${HOME}:/bin/sh" >> /etc/passwd
    fi
fi

base_dir=$(cd "$(dirname "$0")"; pwd)

exec "${base_dir}"/plugin-remote-endpoint
