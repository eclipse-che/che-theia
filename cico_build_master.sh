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

# Output command before executing
set -x

# Exit on error
set -e

#include common scripts
. ./cico_common.sh
. ./build.include


parse "$@"

install_deps
load_jenkins_vars
buildImages
publishImagesOnQuay
