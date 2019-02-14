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

if [ -f che-editor-plugin.tar.gz ]; then
    rm che-editor-plugin.tar.gz
fi

cd etc
tar zcvf ../che-editor-plugin.tar.gz .
