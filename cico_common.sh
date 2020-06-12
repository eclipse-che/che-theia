#!/bin/sh
#
# Copyright (c) 2019 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# See: https://sipb.mit.edu/doc/safe-shell/

# Source environment variables of the jenkins slave
# that might interest this worker.
function load_jenkins_vars() {
  if [ -e "jenkins-env.json" ]; then
    eval "$(./env-toolkit load -f jenkins-env.json \
            AKAMAI_CHE_AUTH \
            CHE_BOT_GITHUB_TOKEN \
            QUAY_ECLIPSE_CHE_USERNAME \
            QUAY_ECLIPSE_CHE_PASSWORD \
            CHE_NPM_AUTH_TOKEN \
            JENKINS_URL \
            GIT_BRANCH \
            GIT_COMMIT \
            BUILD_NUMBER \
            ghprbSourceBranch \
            ghprbActualCommit \
            BUILD_URL \
            ghprbPullId)"
    #export provided GH token
    export GITHUB_TOKEN=${CHE_BOT_GITHUB_TOKEN}
    export NPM_AUTH_TOKEN=${CHE_NPM_AUTH_TOKEN}
  fi
}

function install_deps() {
  # We need to disable selinux for now, XXX
  /usr/sbin/setenforce 0  || true
  #set buildx env
  export DOCKER_BUILD_KIT=1
  export DOCKER_CLI_EXPERIMENTAL=enabled

  # Get all the deps in
  yum install -y yum-utils device-mapper-persistent-data lvm2
  yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
  curl -sL https://rpm.nodesource.com/setup_10.x | bash -
  yum-config-manager --add-repo https://dl.yarnpkg.com/rpm/yarn.repo

  yum install -y epel-release
  yum install -y docker-ce git nodejs yarn gcc-c++ make jq

  service docker start
  echo 'CICO: Dependencies installed'
}

function buildx_support() {

  #check docker version
  docker_version="$(docker --version | cut -d' ' -f3 | tr -cd '0-9.')"
  if [[ "$(version "$docker_version")" < "$(version '19.03')" ]]; then
    echo "CICO: Docker $docker_version is too old. Greater than or equal to 19.03 is required."
    exit 1
  fi

  #Kernel version
  kernel_version="$(uname -r)"
  if [[ "$(version "$kernel_version")" < "$(version '4.8')" ]]; then
    echo "Kernel $kernel_version too old - need >= 4.8." \
          " Install a newer kernel."
  else
    echo "kernel $kernel_version has binfmt_misc fix-binary (F) support."
  fi

  #Note: Buildx can only access the local docker images with `docker` driver. Run `docker buildx ls` to check what driver is being used by the default builder instance.

  #Enable qemu and binfmt support
  docker run --rm --privileged docker/binfmt:66f9012c56a8316f9244ffd7622d7c21c1f6f28d
  docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
}

function version() {
  printf '%02d' $(echo "$1" | tr . ' ' | sed -e 's/ 0*/ /g') 2>/dev/null
}

publishImagesOnQuay() {
    REGISTRY="quay.io"
    # For pushing to quay.io 'eclipse' organization we need to use different credentials
    QUAY_USERNAME=${QUAY_ECLIPSE_CHE_USERNAME}
    QUAY_PASSWORD=${QUAY_ECLIPSE_CHE_PASSWORD}
    if [ -n "${QUAY_USERNAME}" ] && [ -n "${QUAY_PASSWORD}" ]; then
        docker login -u "${QUAY_USERNAME}" -p "${QUAY_PASSWORD}" "${REGISTRY}"
    else
      echo "Could not login, missing credentials for pushing to the '${ORGANIZATION}' organization"
      return
    fi

  for image in "${PUBLISH_IMAGES_LIST[@]}"
  do
    echo "Publishing image ${image}..."
    if [[ -n "${THEIA_DOCKER_IMAGE_VERSION}" ]]; then
      docker tag "${image}:${IMAGE_TAG}" "${REGISTRY}/${image}:${THEIA_DOCKER_IMAGE_VERSION}"
      docker tag "${image}:${IMAGE_TAG}" "${REGISTRY}/${image}:${IMAGE_TAG}"
      echo y | docker push "${REGISTRY}/${image}:${IMAGE_TAG}"
      echo y | docker push "${REGISTRY}/${image}:${THEIA_DOCKER_IMAGE_VERSION}"
    else
      docker tag "${image}:${IMAGE_TAG}" "${REGISTRY}/${image}:${IMAGE_TAG}"
      echo y | docker push "${REGISTRY}/${image}:${IMAGE_TAG}"
    fi
  done
}
