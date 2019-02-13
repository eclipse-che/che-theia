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
LOCAL_ASSEMBLY_DIR="${DIR}"/eclipse-che-theia-plugin-ext

if [ -d "${LOCAL_ASSEMBLY_DIR}" ]; then
  rm -r "${LOCAL_ASSEMBLY_DIR}"
fi

#in mac os 'cp' cannot create destination dir, so create it first
mkdir ${LOCAL_ASSEMBLY_DIR}

echo "Copying ${base_dir}/../../extensions/eclipse-che-theia-plugin-ext --> ${LOCAL_ASSEMBLY_DIR}"
cp -r "${base_dir}/../../extensions/eclipse-che-theia-plugin-ext/." "${LOCAL_ASSEMBLY_DIR}"


init --name:theia-endpoint-runtime "$@"
build
