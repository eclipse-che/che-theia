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

export CDN_PREFIX=https://static.developers.redhat.com/che/theia_artifacts/
export MONACO_CDN_PREFIX=https://cdn.jsdelivr.net/npm/

/bin/bash ./cico_build_master.sh
