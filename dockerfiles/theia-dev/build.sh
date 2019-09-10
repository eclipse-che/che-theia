#!/bin/bash
#
# Copyright (c) 2018 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0

base_dir=$(cd "$(dirname "$0")"; pwd)
. "${base_dir}"/../build.include


DIR=$(cd "$(dirname "$0")"; pwd)
LOCAL_ASSEMBLY_DIR="${DIR}"/generator

if [ -d "${LOCAL_ASSEMBLY_DIR}" ]; then
  rm -r "${LOCAL_ASSEMBLY_DIR}"
fi

# In mac os 'cp' cannot create destination dir, so create it first
mkdir ${LOCAL_ASSEMBLY_DIR}

FILE="${base_dir}"/../../generator/eclipse-che-theia-generator.tgz
if [ -f "$FILE" ]; then
    cp "${FILE}" "${LOCAL_ASSEMBLY_DIR}"
else
    echo "$FILE does not exist, trying to generate..."
    (cd "${base_dir}"/../../generator/ && yarn prepare && yarn pack --filename eclipse-che-theia-generator.tgz)
    cp "${FILE}" "${LOCAL_ASSEMBLY_DIR}"
fi

init --name:theia-dev "$@"
build
if ! skip_tests; then
  bash "${base_dir}"/e2e/build.sh "$@"
fi
