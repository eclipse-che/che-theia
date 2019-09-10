#!/bin/bash
#
# Copyright (c) 2019 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# See: https://sipb.mit.edu/doc/safe-shell/
. ./docker_image_build.include
set -e
set -o pipefail

yarn

if [ "${1:-}" = "--pr" ]; then
    echo "Building PR images..."
    buildImages "${PR_IMAGES[@]}"
else
    echo "Building ALL images..."
    buildImages "${DOCKER_FILES_LOCATIONS[@]}"
fi

if [ "${1:-}" = "--push" ]; then
    echo "Pushing ALL images..."
    publishImages "${IMAGES_LIST[@]}"
fi
