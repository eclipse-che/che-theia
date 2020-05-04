#!/bin/bash
#
# Copyright (c) 2019 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#

# Release process automation script. 
# Used to create branch/tag, update the necessary files
# and trigger release by force pushing changes to the release branch.

# set to 1 to actually trigger changes in the release branch
TRIGGER_RELEASE=0 
NOCOMMIT=0

while [[ "$#" -gt 0 ]]; do
  case $1 in
    '-t'|'--trigger-release') TRIGGER_RELEASE=1; NOCOMMIT=0; shift 0;;
    '-r'|'--repo') REPO="$2"; shift 1;;
    '-v'|'--version') VERSION="$2"; shift 1;;
    '-n'|'--no-commit') NOCOMMIT=1; TRIGGER_RELEASE=0; shift 0;;
  esac
  shift 1
done

usage ()
{
  echo "Usage: $0 --repo <GIT REPO TO EDIT> --version <VERSION_TO_RELEASE> --trigger-release"
  echo "Example: $0 --repo git@github.com:eclipse/che-theia --version 7.7.0 --trigger-release"; echo
}

if [[ ! ${VERSION} ]] || [[ ! ${REPO} ]]; then
  usage
  exit 1
fi

# derive branch from version
BRANCH=${VERSION%.*}.x

# if doing a .0 release, use master; if doing a .z release, use $BRANCH
if [[ ${VERSION} == *".0" ]]; then
  BASEBRANCH="master"
else 
  BASEBRANCH="${BRANCH}"
fi

# work in tmp dir
TMP=$(mktemp -d); pushd "$TMP" > /dev/null || exit 1

# get sources from ${BASEBRANCH} branch
echo "Check out ${REPO} to ${TMP}/${REPO##*/}"
git clone "${REPO}" -q
cd "${REPO##*/}" || exit 1
git fetch origin "${BASEBRANCH}":"${BASEBRANCH}"
git checkout "${BASEBRANCH}"

# create new branch off ${BASEBRANCH} (or check out latest commits if branch already exists), then push to origin
if [[ "${BASEBRANCH}" != "${BRANCH}" ]]; then
  git branch "${BRANCH}" || git checkout "${BRANCH}" && git pull origin "${BRANCH}"
  git push origin "${BRANCH}"
  git fetch origin "${BRANCH}:${BRANCH}"
  git checkout "${BRANCH}"
fi

apply_files_edits () {
  THEIA_VERSION=$(curl --silent http://registry.npmjs.org/-/package/@theia/core/dist-tags | sed 's/.*"next":"\(.*\)".*/\1/')
  if [[ ! ${THEIA_VERSION} ]]; then
    echo "Failed to get Theia next version from npmjs.org"; echo
    exit 1
  fi

  # update config for Che Theia generator
  sed -i che-theia-init-sources.yml -e "/checkoutTo:/s/master/${BRANCH}/"

  # set the variables for building the images
  sed -i build.include \
      -e 's/IMAGE_TAG="..*"/IMAGE_TAG="latest"/' \
      -e 's/^THEIA_COMMIT_SHA=$/THEIA_COMMIT_SHA="'${THEIA_VERSION##*.}'"/' \
      -e 's/THEIA_DOCKER_IMAGE_VERSION=.*/THEIA_DOCKER_IMAGE_VERSION="'${VERSION}'"/'

  # Update extensions/plugins package.json files:
  # - set packages' version
  # - update versions of Theia and Che dependencies
  for m in "extensions/*" "plugins/*"; do
    sed -i ./${m}/package.json \
        -r -e 's/("version": )(".*")/\1"'$VERSION'"/' \
        -r -e '/plugin-packager/!s/("@theia\/..*": )(".*")/\1"'${THEIA_VERSION}'"/' \
        -r -e '/@eclipse-che\/api|@eclipse-che\/workspace-client|@eclipse-che\/workspace-telemetry-client/!s/("@eclipse-che\/..*": )(".*")/\1"'$VERSION'"/'
  done

  if [[ ${VERSION} == *".0" ]]; then
    sed -i dockerfiles/theia/docker/ubi8/builder-clone-theia.dockerfile \
        -e '$ a RUN cd ${HOME} \&\& tar zcf ${HOME}/theia-source-code.tgz theia-source-code'
  fi
}

apply_files_edits

# commit change into branch
if [[ ${NOCOMMIT} -eq 0 ]]; then
  COMMIT_MSG="[release] Bump to ${VERSION} in ${BRANCH}"
  git commit -a -s -m "${COMMIT_MSG}"
  git pull origin "${BRANCH}"
  git push origin "${BRANCH}"
fi

if [[ $TRIGGER_RELEASE -eq 1 ]]; then
  # push new branch to release branch to trigger CI build
  git fetch origin "${BRANCH}:${BRANCH}"
  git checkout "${BRANCH}"
  git branch release -f 
  git push origin release -f

  # tag the release
  git checkout "${BRANCH}"
  git tag "${VERSION}"
  git push origin "${VERSION}"
fi

popd > /dev/null || exit

# cleanup tmp dir
cd /tmp && rm -fr "$TMP"
