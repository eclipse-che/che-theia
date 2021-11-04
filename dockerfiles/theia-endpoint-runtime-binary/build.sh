#!/bin/bash
#
# Copyright (c) 2019 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#

base_dir=$(cd "$(dirname "$0")"; pwd)
. "${base_dir}"/../build.include

init --name:theia-endpoint-runtime-binary "$@"
build

# Run unit tests
UNIT_TEST_CHECK_IMAGE_NAME="${IMAGE_NAME}-test"
docker build -t "${UNIT_TEST_CHECK_IMAGE_NAME}" -f test.Dockerfile .
printf "${GREEN}Tests run successfully: ${BLUE}${UNIT_TEST_CHECK_IMAGE_NAME}${NC}\n"
