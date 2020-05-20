#!/bin/bash
#
# Copyright (c) 2019-2020 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#

# update FROM lines in Dockerfiles to the latest base images

# get script
if [[ ! -f /tmp/updateBaseImages.sh ]]; then 
    pushd /tmp >/dev/null || exit
    curl -sSLO https://raw.githubusercontent.com/redhat-developer/codeready-workspaces/master/product/updateBaseImages.sh
    chmod +x updateBaseImages.sh
    popd >/dev/null || exit
fi

# this will attempt to push the change directly, and if it fails, will then 
# try to generate a PR using hub if installed, or simply create a PR branch in origin
now="$(date +%s)"
PR_BRANCH="pr-master-update-base-images-${now}"
BRANCHUSED=master
for d in $(find $(pwd)/dockerfiles -name "*ockerfile" | grep ubi); do 
    if [[ $(grep access.redhat.com/containers $d) ]]; then 
        f=${d##*/}
        dir=${d%/*}
        /tmp/updateBaseImages.sh -b ${BRANCHUSED} -w ${dir} -maxdepth 1 -f $f -prb "${PR_BRANCH}" --no-push
    fi
done

# create pull request for master branch, as branch is restricted
git branch "${PR_BRANCH}" || true
git checkout "${PR_BRANCH}" || true
git pull origin "${PR_BRANCH}" || true
git push origin "${PR_BRANCH}"
lastCommitComment="$(git log -1 --pretty=%B)"
if [[ $(/usr/local/bin/hub version 2>/dev/null || true) ]] || [[ $(which hub 2>/dev/null || true) ]]; then
    hub pull-request -f -m "${lastCommitComment}

${lastCommitComment}" -b "${BRANCHUSED}" -h "${PR_BRANCH}" --browse
else
    echo "# Warning: hub is required to generate pull requests. See https://hub.github.com/ to install it."
    echo -n "# To manually create a pull request, go here: "
    git config --get remote.origin.url | sed -r -e "s#:#/#" -e "s#git@#https://#" -e "s#\.git#/tree/${PR_BRANCH}/#"
fi
