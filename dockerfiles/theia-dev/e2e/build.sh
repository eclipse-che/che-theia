#!/bin/bash
# Copyright (c) 2018-2019 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0

base_dir=$(cd "$(dirname "$0")"; pwd)
. "${base_dir}/../../build.include"

check_github_limits

init --name:theia-dev-e2e "$@"
build
