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

DIR=$(cd "$(dirname "$0")"; pwd)
LOCAL_ASSEMBLY_DIR="${DIR}"/che-theia

if [ -d "${LOCAL_ASSEMBLY_DIR}" ]; then
  rm -r "${LOCAL_ASSEMBLY_DIR}"
fi

#in mac os 'cp' cannot create destination dir, so create it first
mkdir ${LOCAL_ASSEMBLY_DIR}

echo "Compresing 'che-theia' --> ${LOCAL_ASSEMBLY_DIR}/che-theia.tar.gz"
cd "${DIR}"/../.. && git ls-files -z -c -o --exclude-standard | xargs -0 tar rvf ${LOCAL_ASSEMBLY_DIR}/che-theia.tar.gz

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

echo "Extracting artifacts for the CDN"
mkdir -p "${base_dir}/theia_artifacts"
"${base_dir}"/extract-for-cdn.sh "$IMAGE_NAME" "${base_dir}/theia_artifacts"
LABEL_CONTENT=$(cat "${base_dir}"/theia_artifacts/cdn.json || true 2>/dev/null)
if [ -n "${LABEL_CONTENT}" ]; then
  BUILD_ARGS+="--label che-plugin.cdn.artifacts=$(echo ${LABEL_CONTENT} | sed 's/ //g') "
  echo "Rebuilding with CDN label..."
  build
  "${base_dir}"/push-cdn-files-to-akamai.sh
fi
