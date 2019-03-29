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

set -e
set -o pipefail

# KEEP RIGHT ORDER!!!
DOCKER_FILES_LOCATIONS=(
dockerfiles/theia-dev
dockerfiles/theia
dockerfiles/theia-endpoint-runtime
dockerfiles/remote-plugin-runner-java8
dockerfiles/remote-plugin-go-1.10.7
)

IMAGES_LIST=(
eclipse/che-theia-dev
eclipse/che-theia
eclipse/che-theia-endpoint-runtime
eclipse/che-remote-plugin-runner-java8
eclipse/che-remote-plugin-go-1.10.7
)


# BUILD IMAGES
for image_dir in "${DOCKER_FILES_LOCATIONS[@]}"
    do
        GITHUB_TOKEN_ARG="GITHUB_TOKEN="${GITHUB_TOKEN}
        if [ "$image_dir" == "dockerfiles/theia" ]; then
            THEIA_IMAGE_TAG="latest"
            bash $(pwd)/$image_dir/build.sh --build-args:${GITHUB_TOKEN_ARG},THEIA_VERSION=0.4.0 --tag:0.4.0 --branch:v0.4.0 --git-ref:refs\\/tags\\/v\$\{THEIA_VERSION\}
        elif [ "$image_dir" == "dockerfiles/theia-dev" ]; then
            bash $(pwd)/$image_dir/build.sh --build-arg:${GITHUB_TOKEN_ARG} --tag:0.4.0
        else
            bash $(pwd)/$image_dir/build.sh --build-arg:${GITHUB_TOKEN_ARG} --tag:latest
        fi
        if [ $? -ne 0 ]; then
            echo "ERROR:"
            echo "build of '$image_dir' image is failed!"
            exit 1
        fi
    done

#PUSH IMAGES
#docker login -u ${DOCKER_USERNAME} -p ${DOCKER_PASSWORD}
echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin
for image in "${IMAGES_LIST[@]}"
    do
        if [ "$image" == "eclipse/che-theia" ]; then
            docker tag ${image}:0.4.0 ${image}:${THEIA_IMAGE_TAG}
            echo y | docker push ${image}:${THEIA_IMAGE_TAG}
            echo y | docker push ${image}:0.4.0
        elif [ "$image" == "eclipse/che-theia-dev" ]; then 
            docker tag ${image}:0.4.0 ${image}:${THEIA_IMAGE_TAG}
            echo y | docker push ${image}:${THEIA_IMAGE_TAG}
            echo y | docker push ${image}:0.4.0
        else
            echo y | docker push ${image}:latest
        fi
    done
