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

# KEEP RIGHT ORDER!!!
DOCKER_FILES_LOCATIONS=(
dockerfiles/theia-dev
dockerfiles/theia
dockerfiles/theia-endpoint-runtime
dockerfiles/remote-plugin-runner-java8
dockerfiles/remote-plugin-go-1.10.7
dockerfiles/remote-plugin-python-3.7.3
dockerfiles/remote-plugin-dotnet-2.2.105
dockerfiles/remote-plugin-kubernetes-tooling-0.1.17
dockerfiles/remote-plugin-kubernetes-tooling-1.0.0
dockerfiles/remote-plugin-openshift-connector-0.0.17
dockerfiles/remote-plugin-openshift-connector-0.0.21
)

IMAGES_LIST=(
eclipse/che-theia-dev
eclipse/che-theia
eclipse/che-theia-endpoint-runtime
eclipse/che-remote-plugin-runner-java8
eclipse/che-remote-plugin-go-1.10.7
eclipse/che-remote-plugin-python-3.7.3
eclipse/che-remote-plugin-dotnet-2.2.105
eclipse/che-remote-plugin-kubernetes-tooling-0.1.17
eclipse/che-remote-plugin-kubernetes-tooling-1.0.0
eclipse/che-remote-plugin-openshift-connector-0.0.17
eclipse/che-remote-plugin-openshift-connector-0.0.21
)


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
