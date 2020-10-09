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

sed_in_place() {
    SHORT_UNAME=$(uname -s)
  if [ "$(uname)" == "Darwin" ]; then
    sed -i '' "$@"
  elif [ "${SHORT_UNAME:0:5}" == "Linux" ]; then
    sed -i "$@"
  fi
}

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
  if [[ ! ${THEIA_VERSION} ]] || [[ ${THEIA_VERSION} == \"Unauthorized\" ]]; then
    echo "Failed to get Theia next version from npmjs.org. Try again."; echo
    exit 1
  fi

  WS_CLIENT_VERSION=$(curl --silent http://registry.npmjs.org/-/package/@eclipse-che/workspace-client/dist-tags | sed 's/.*"latest":"\(.*\)".*/\1/')
  if [[ ! ${WS_CLIENT_VERSION} ]] || [[ ${WS_CLIENT_VERSION} == \"Unauthorized\" ]]; then
    echo "Failed to get @eclipse-che/workspace-client latest version from npmjs.org. Try again."; echo
    exit 1
  fi

  WS_TELEMETRY_CLIENT_VERSION=$(curl --silent http://registry.npmjs.org/-/package/@eclipse-che/workspace-telemetry-client/dist-tags | sed 's/.*"latest":"\(.*\)".*/\1/')
  if [[ ! ${WS_TELEMETRY_CLIENT_VERSION} ]] || [[ ${WS_TELEMETRY_CLIENT_VERSION} == \"Unauthorized\" ]]; then
    echo "Failed to get @eclipse-che/workspace-telemetry-client latest version from npmjs.org. Try again."; echo
    exit 1
  fi

  API_DTO_VERSION=$(curl --silent http://registry.npmjs.org/-/package/@eclipse-che/api/dist-tags | sed 's/.*"latest":"\(.*\)".*/\1/')
  if [[ ! ${API_DTO_VERSION} ]] || [[ ${API_DTO_VERSION} == \"Unauthorized\" ]]; then
    echo "Failed to get @eclipse-che/api latest version from npmjs.org. Try again."; echo
    exit 1
  fi

  # update config for Che Theia generator
  sed_in_place -e "/checkoutTo:/s/master/${BRANCH}/" che-theia-init-sources.yml
  sed_in_place -e "/checkoutTo:/s/master/${BRANCH}/" che-theia-init-sources.yml

  # set the variables for building the images
  sed_in_place -e "s/IMAGE_TAG=\"..*\"/IMAGE_TAG=\"latest\"/" build.include
  sed_in_place -e "s/^THEIA_COMMIT_SHA=$/THEIA_COMMIT_SHA=\"${THEIA_VERSION##*.}\"/" build.include
  sed_in_place -e "s/THEIA_DOCKER_IMAGE_VERSION=.*/THEIA_DOCKER_IMAGE_VERSION=\"${VERSION}\"/" build.include

  for m in "extensions/*" "plugins/*"; do
    PACKAGE_JSON="${m}"/package.json
    # shellcheck disable=SC2086
    sed_in_place -r -e "s/(\"version\": )(\".*\")/\1\"$VERSION\"/" ${PACKAGE_JSON}
    # shellcheck disable=SC2086
    sed_in_place -r -e "/@eclipse-che\/api|@eclipse-che\/workspace-client|@eclipse-che\/workspace-telemetry-client/!s/(\"@eclipse-che\/..*\": )(\".*\")/\1\"$VERSION\"/" ${PACKAGE_JSON}
  done

  if [[ ${VERSION} == *".0" ]]; then
    for m in "extensions/*" "plugins/*"; do
      PACKAGE_JSON="${m}"/package.json
      # shellcheck disable=SC2086
      sed_in_place -r -e "/plugin-packager/!s/(\"@theia\/..*\": )(\"next\")/\1\"${THEIA_VERSION}\"/" ${PACKAGE_JSON}
      # shellcheck disable=SC2086
      sed_in_place -r -e "s/(\"@eclipse-che\/workspace-client\": )(\"latest\")/\1\"$WS_CLIENT_VERSION\"/" ${PACKAGE_JSON}
      # shellcheck disable=SC2086
      sed_in_place -r -e "s/(\"@eclipse-che\/workspace-telemetry-client\": )(\"latest\")/\1\"$WS_TELEMETRY_CLIENT_VERSION\"/" ${PACKAGE_JSON}
      # shellcheck disable=SC2086
      sed_in_place -r -e "s/(\"@eclipse-che\/api\": )(\"latest\")/\1\"$API_DTO_VERSION\"/" ${PACKAGE_JSON}
    done

    sed_in_place -e '$ a RUN cd ${HOME} \&\& tar zcf ${HOME}/theia-source-code.tgz theia-source-code' dockerfiles/theia/docker/ubi8/builder-clone-theia.dockerfile
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
