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
  read THEIA_VERSION < THEIA_VERSION
  if [[ ! ${THEIA_VERSION} ]]; then
    echo "THEIA_VERSION file is not found"; echo
    exit 1
  fi

  # Che Theia release may depend on Theia next or latest
  if [[ ${THEIA_VERSION} == *"-next."* ]]; then
    THEIA_PATCHES_DIR=master
    THEIA_BRANCH=master
    THEIA_GIT_REFS=refs\\\\\\\\/heads\\\\\\\\/master
  else 
    THEIA_PATCHES_DIR=${THEIA_VERSION}
    THEIA_BRANCH=v${THEIA_VERSION}
    THEIA_GIT_REFS=refs\\\\\\\\/tags\\\\\\\\/v${THEIA_VERSION}
  fi

  # update config for Che Theia generator
  sed -i che-theia-init-sources.yml -e "/checkoutTo:/s/master/${BRANCH}/"

  # set the variables for an image build
  sed -i build.include \
      -e 's/IMAGE_TAG="..*"/IMAGE_TAG="latest"/' \
      -e 's/THEIA_VERSION="..*"/THEIA_VERSION="'${THEIA_PATCHES_DIR}'"/' \
      -e 's/THEIA_BRANCH="..*"/THEIA_BRANCH="'${THEIA_BRANCH}'"/' \
      -e 's#THEIA_GIT_REFS="..*"#THEIA_GIT_REFS="'${THEIA_GIT_REFS}'"#' \
      -e 's/THEIA_DOCKER_IMAGE_VERSION=.*/THEIA_DOCKER_IMAGE_VERSION="'${VERSION}'"/'

  # Update extensions/plugins package.json files:
  # - set packages' version
  # - update versions of Theia dependencies
  # - update versions of Che dependencies
  for m in "extensions/*" "plugins/*"; do
    sed -i ./${m}/package.json \
        -r -e 's/("version": )(".*")/\1"'$VERSION'"/' \
        -r -e '/plugin-packager/!s/("@theia\/..*": )(".*")/\1"'${THEIA_VERSION}'"/' \
        -r -e '/@eclipse-che\/api|@eclipse-che\/workspace-client|@eclipse-che\/workspace-telemetry-client/!s/("@eclipse-che\/..*": )(".*")/\1"'$VERSION'"/'
  done

  if [[ ${THEIA_BRANCH} == master ]]; then
    THEIA_COMMIT_SHA=${THEIA_VERSION##*.}

    if [[ ${VERSION} == *".0" ]]; then
      # if depending on Theia next (from master), need to checkout to the corresponding commit
      for m in "dockerfiles/theia/docker/alpine/builder-clone-theia.dockerfile" "dockerfiles/theia/docker/ubi8/builder-clone-theia.dockerfile"; do
        sed -i ./${m} \
            -e 's/ --depth 1//' \
            -e '/RUN git clone/s#$# \&\& cd ${HOME}/theia-source-code \&\& git checkout '${THEIA_COMMIT_SHA}'#'
      done

      sed -i dockerfiles/theia/docker/ubi8/builder-clone-theia.dockerfile \
          -e '/RUN git clone/s#$# \&\& cd ${HOME} \&\& tar zcf ${HOME}/theia-source-code.tgz theia-source-code#'
    else
      # Doing a .z release. So, both (alpine/ubi8) builder-clone-theia.dockerfile are already patched.
      # Just need to ensure that using a correct $THEIA_COMMIT_SHA
      # as .z release may be based on a different Theia version comparing to a .0 release.
      sed -i dockerfiles/theia/docker/alpine/builder-clone-theia.dockerfile \
          -r -e 's/( git checkout )(.*)/\1'${THEIA_COMMIT_SHA}'/'
      sed -i dockerfiles/theia/docker/ubi8/builder-clone-theia.dockerfile \
          -r -e 's/( git checkout )(.*)( \&\& cd )/\1'${THEIA_COMMIT_SHA}'\3/'
    fi
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
