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

printf "\033[0;31mThis script is deprecated, use build.sh instead\033[0m\n"

# BUILD IMAGES
for image_dir in "${DOCKER_FILES_LOCATIONS[@]}"
    do
        GITHUB_TOKEN_ARG="GITHUB_TOKEN="${GITHUB_TOKEN}
        if [ "$image_dir" == "dockerfiles/theia" ]; then
            bash $(pwd)/$image_dir/build.sh --build-args:${GITHUB_TOKEN_ARG},THEIA_VERSION=${THEIA_VERSION} --tag:${IMAGE_TAG} --branch:${THEIA_BRANCH} --git-ref:${THEIA_GIT_REFS} 
        elif [ "$image_dir" == "dockerfiles/theia-dev" ]; then
            bash $(pwd)/$image_dir/build.sh --build-arg:${GITHUB_TOKEN_ARG} --tag:${IMAGE_TAG}
        else
            bash $(pwd)/$image_dir/build.sh --build-arg:${GITHUB_TOKEN_ARG} --tag:${IMAGE_TAG}
        fi
        if [ $? -ne 0 ]; then
            echo "ERROR:"
            echo "build of '$image_dir' image is failed!"
            exit 1
        fi
    done


#PUSH IMAGES
echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin
for image in "${IMAGES_LIST[@]}"
    do
        if [ ! -z ${THEIA_DOCKER_IMAGE_VERSION} ]; then
            docker tag ${image}:${IMAGE_TAG} ${image}:${THEIA_DOCKER_IMAGE_VERSION}
            echo y | docker push ${image}:${IMAGE_TAG}
            echo y | docker push ${image}:${THEIA_DOCKER_IMAGE_VERSION}
        else
            echo y | docker push ${image}:${IMAGE_TAG}
        fi
    done
