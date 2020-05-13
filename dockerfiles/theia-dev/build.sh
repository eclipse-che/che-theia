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

CHE_THEIA_GENERATOR_PACKAGE_NAME=eclipse-che-theia-generator.tgz
CHE_THEIA_GENERATOR_PACKAGE="${base_dir}/../../generator/${CHE_THEIA_GENERATOR_PACKAGE_NAME}"
# Rebuild Che Theia generator if:
#  - it hasn't been built yet
#  - there is any changes in the generator directory
#  - there is a commit newer than the generator build time
cd "${base_dir}/../../"
if [ ! -f "$CHE_THEIA_GENERATOR_PACKAGE" ] || \
   [ -n "$(git status generator --porcelain)" ] || \
   [ $(git log -1 --pretty=%ct -- generator) -gt $(date -r $CHE_THEIA_GENERATOR_PACKAGE +%s) ]
then
    # Delete previous archive if any
    rm -f $CHE_THEIA_GENERATOR_PACKAGE
    echo "Building Che Theia generator"
    cd "${base_dir}"/../../generator/ && yarn && yarn pack --filename $CHE_THEIA_GENERATOR_PACKAGE_NAME
fi
echo "Copying Che Theia generator"
cp "${CHE_THEIA_GENERATOR_PACKAGE}" "${base_dir}/asset-${CHE_THEIA_GENERATOR_PACKAGE_NAME}"

rm -rf ${base_dir}/asset-unpacked-generator && mkdir ${base_dir}/asset-unpacked-generator
tar zxf "${base_dir}/asset-${CHE_THEIA_GENERATOR_PACKAGE_NAME}" --strip-components=1 -C ${base_dir}/asset-unpacked-generator

init --name:theia-dev "$@"
build
