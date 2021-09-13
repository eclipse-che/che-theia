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
. ./build.include
set -e
set -o pipefail

parse "$@"
yarn ${YARN_OPTS}

#Added to handle experimental Travis tag
if [[ -n "${TAG:-}" ]]; then
   if [[ -z "${THEIA_DOCKER_IMAGE_VERSION}" ]]; then
        IMAGE_TAG=$TAG
        if [[ -n "${SUFFIX:-}" ]] && [[ -z "${SHA1_SUFFIX}" ]]; then
          SHA1_SUFFIX=$SUFFIX
        fi
   else
        IMAGE_TAG=$IMAGE_TAG-$SUFFIX
        THEIA_DOCKER_IMAGE_VERSION=$TAG
   fi
fi

buildImages

if is_publish_images; then
    publishImages
fi
