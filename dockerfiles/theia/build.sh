#!/bin/bash
#
# Copyright (c) 2018-2019 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0

base_dir=$(cd "$(dirname "$0")"; pwd)
. "${base_dir}"/../build.include

check_github_limits

DIR=$(cd "$(dirname "$0")"; pwd)

# create che-theia archive
echo "Compresing 'che-theia' --> ${DIR}/asset-che-theia.tar.gz"
cd "${DIR}"/../.. && git ls-files -c -o --exclude-standard | tar cf ${DIR}/asset-che-theia.tar  -T -
echo $(git rev-parse --short HEAD) > .git-che-theia-sha1
tar rf ${DIR}/asset-che-theia.tar .git-che-theia-sha1
gzip -f ${DIR}/asset-che-theia.tar

# Download plugins
THEIA_YEOMAN_PLUGIN="${DIR}/asset-untagged-theia_yeoman_plugin.theia"
if [ ! -f "${THEIA_YEOMAN_PLUGIN}" ]; then
    curl -L -o ${THEIA_YEOMAN_PLUGIN} https://github.com/eclipse/theia-yeoman-plugin/releases/download/untagged-8a7963262e021dab8ae0/theia_yeoman_plugin.theia
fi

init --name:theia "$@"

if [ "${CDN_PREFIX:-}" != "" ]; then
  BUILD_ARGS+="--build-arg CDN_PREFIX=${CDN_PREFIX} "
fi

if [ "${MONACO_CDN_PREFIX:-}" != "" ]; then
  BUILD_ARGS+="--build-arg MONACO_CDN_PREFIX=${MONACO_CDN_PREFIX} "
fi

build

if ! skip_tests; then
  bash "${base_dir}"/e2e/build.sh "$PREFIX-$NAME" "$@"
fi

if [[ -z "$DOCKER_BUILD_TARGET" ]]; then
  echo "Extracting artifacts for the CDN"
  mkdir -p "${base_dir}/theia_artifacts"
  "${base_dir}"/extract-for-cdn.sh "$IMAGE_NAME" "${base_dir}/theia_artifacts"
  LABEL_CONTENT=$(cat "${base_dir}"/theia_artifacts/cdn.json || true 2>/dev/null)
  if [ -n "${LABEL_CONTENT}" ]; then
    echo "Adding the CDN label..."
    docker build --label che-plugin.cdn.artifacts="$(echo ${LABEL_CONTENT} | sed 's/ //g')" -t "${IMAGE_NAME}-with-label" -<<EOF
FROM ${IMAGE_NAME}
EOF
    docker tag "${IMAGE_NAME}-with-label" "${IMAGE_NAME}"
    "${base_dir}"/push-cdn-files-to-akamai.sh
  fi
fi
