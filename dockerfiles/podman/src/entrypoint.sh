#!/bin/bash
#
# Copyright (c) 2019 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#

set +e

# Add current (arbitrary) user to /etc/passwd
if ! whoami &> /dev/null; then
  if [ -w /etc/passwd ]; then
    echo "${USER_NAME:-user}:x:$(id -u):0:${USER_NAME:-user} user:${HOME:-/home/user}:/bin/bash" >> /etc/passwd
  fi
fi

# Change podman config. This allows Podman to be run without the newuidmap and newgidmap binaries,
# and removes the need for any elevated privileges to start rootless containers.
if podman info > /dev/null; then
  if [ -w ${HOME:-/home/user}/.config/containers/storage.conf ]; then
    sed -i 's/ignore_chown_errors = ""/ignore_chown_errors = "true"/g' ${HOME:-/home/user}/.config/containers/storage.conf
  fi
fi

exec "$@"