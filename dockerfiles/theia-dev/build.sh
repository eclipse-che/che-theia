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
init --name:theia-dev "$@"


# Build gnu tar image
GNUTAR_IMAGE_NAME="eclipse-che-theia-tar-build"
build_tar_image() {
  printf "Building image ${GNUTAR_IMAGE_NAME}${NC}..."
  if docker build -t eclipse-che-theia-tar-build > docker-build-log 2>&1 -<<EOF
  FROM alpine:3.11.3
  WORKDIR /workdir/
  RUN apk add --no-cache --update tar
EOF
then
  printf "%b[OK]%b\n" "${GREEN}" "${NC}"
  rm docker-build-log
else
  printf "%bFailure%b\n" "${RED}" "${NC}"
  cat docker-build-log
  exit 1
fi
}

build_tar_image
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
    # Build the file in a way that it's agnostic of timestamp/user who is doing it
    docker run --rm -it -v "${base_dir}/../../generator:/workdir" ${GNUTAR_IMAGE_NAME} sh -c 'mkdir -p unpacked && tar zxf eclipse-che-theia-generator.tgz -C unpacked && tar czf eclipse-che-theia-generator.tgz -C unpacked package --owner=che-theia --group=che-theia --sort=name --clamp-mtime --mtime="CET 2020-01-01 00:00:00" && rm -rf unpacked'
fi
echo "Copying Che Theia generator"
cp "${CHE_THEIA_GENERATOR_PACKAGE}" "${base_dir}/asset-${CHE_THEIA_GENERATOR_PACKAGE_NAME}"


build
if ! dry_run; then
  if ! skip_tests; then
    bash "${base_dir}"/e2e/build.sh "$@"
  fi
fi  
