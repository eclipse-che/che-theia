#!/bin/bash
# Copyright (c) 2020 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

set -e
set -o pipefail

cd ./tools/automation
yarn
yarn run compile
node ./lib/check-extension-updates.js
cd ./report
../node_modules/.bin/vuepress build
cd ./.vuepress/dist
git config --global user.email "che-bot@eclipse.org"
git config --global user.name "CHE Bot"
git init .
git checkout --orphan gh-pages
git add ./*
git commit -m "Automated Built-In Extensions Report $DATE_TIME" -s
git push -f "https://$GITHUB_ACTOR:$GITHUB_TOKEN@github.com/eclipse/che-theia.git" gh-pages
