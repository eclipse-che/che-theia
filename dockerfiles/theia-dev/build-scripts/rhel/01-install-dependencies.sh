#!/bin/sh
#
# Copyright (c) 2019 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation
#

yum install -y curl make cmake gcc gcc-c++ python2 git openssh less bash tar gzip
yum -y clean all && rm -rf /var/cache/yum

# install yarn dependency
npm install -g yarn@1.17.3
