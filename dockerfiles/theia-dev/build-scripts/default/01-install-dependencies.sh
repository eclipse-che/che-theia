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

apk add --update --no-cache \
  curl `# Download some files` \
  jq `# To play with json in shell` \
  make gcc g++ python `# compile some javascript native stuff (node-gyp)` \
  git openssh openssh-keygen `# clone repositories (and also using ssh repositories)` \
  less `# Handle git diff properly` \
  bash `# bash shell` \
  libx11-dev libxkbfile-dev `# some lib to compile 'native-keymap' npm mpdule`

