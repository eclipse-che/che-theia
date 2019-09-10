#!/bin/bash
#
# Copyright (c) 2019 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0

base_dir=$(cd "$(dirname "$0")"; pwd)
. "${base_dir}"/../build.include

check_github_limits

DIR=$(cd "$(dirname "$0")"; pwd)
LOCAL_ASSEMBLY_DIR="${DIR}"/docker-build

if [ -d "${LOCAL_ASSEMBLY_DIR}" ]; then
  rm -rf "${LOCAL_ASSEMBLY_DIR}"
fi

# In mac os 'cp' cannot create destination dir, so create it first
mkdir ${LOCAL_ASSEMBLY_DIR}

echo "Copying ${base_dir}/../../extensions/eclipse-che-theia-plugin --> ${LOCAL_ASSEMBLY_DIR}/theia-plugin"
mkdir ${LOCAL_ASSEMBLY_DIR}/theia-plugin
cp -r "${base_dir}/../../extensions/eclipse-che-theia-plugin/src/." "${LOCAL_ASSEMBLY_DIR}/theia-plugin/src/"
cp -r "${base_dir}/../../extensions/eclipse-che-theia-plugin/package.json" "${LOCAL_ASSEMBLY_DIR}/theia-plugin"

echo "Copying ${base_dir}/../../extensions/eclipse-che-theia-plugin-ext --> ${LOCAL_ASSEMBLY_DIR}/theia-plugin-ext"
mkdir ${LOCAL_ASSEMBLY_DIR}/theia-plugin-ext
cp -r "${base_dir}/../../extensions/eclipse-che-theia-plugin-ext/src/." "${LOCAL_ASSEMBLY_DIR}/theia-plugin-ext/src/"
cp -r "${base_dir}/../../extensions/eclipse-che-theia-plugin-ext/package.json" "${LOCAL_ASSEMBLY_DIR}/theia-plugin-ext"
cp -r "${base_dir}/../../extensions/eclipse-che-theia-plugin-ext/tsconfig.json" "${LOCAL_ASSEMBLY_DIR}/theia-plugin-ext"
cp -r "${base_dir}/../../extensions/eclipse-che-theia-plugin-ext/webpack.config.js" "${LOCAL_ASSEMBLY_DIR}/theia-plugin-ext"

echo "Copying ${base_dir}/../../configs --> ${LOCAL_ASSEMBLY_DIR}/configs"
cp -r "${base_dir}/../../configs/." "${LOCAL_ASSEMBLY_DIR}/configs"

echo "Copying ${base_dir}/../../extensions/eclipse-che-theia-plugin-remote --> ${LOCAL_ASSEMBLY_DIR}/theia-plugin-remote"
mkdir ${LOCAL_ASSEMBLY_DIR}/theia-plugin-remote
cp -r "${base_dir}/../../extensions/eclipse-che-theia-plugin-remote/src/." "${LOCAL_ASSEMBLY_DIR}/theia-plugin-remote/src/"
cp -r "${base_dir}/../../extensions/eclipse-che-theia-plugin-remote/package.json" "${LOCAL_ASSEMBLY_DIR}/theia-plugin-remote"
cp -r "${base_dir}/../../extensions/eclipse-che-theia-plugin-remote/tsconfig.json" "${LOCAL_ASSEMBLY_DIR}/theia-plugin-remote"


init --name:theia-endpoint-runtime "$@"
build
