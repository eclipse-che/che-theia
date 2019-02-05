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
set -u

base_dir=$(cd "$(dirname "$0")"; pwd)
cd ${base_dir}

build_directory() {
    # Calling build.sh
    if [ -e ${directory}/build.sh ] ; then
        ${directory}build.sh
    else
        printf "${RED}No build.sh in directory ${directory}${NC}\n"
        exit 2
    fi
}

# loop on all directories and call build.sh script if present
for directory in */ ; do
    if [ -e ${directory}/build.sh ] ; then
        build_directory ${directory}
    else
        printf "${RED}skipping ${directory} as there is no build.sh script${NC}\n"
    fi
done
