#!/bin/bash
#
# Copyright (c) 2021 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation
#
# Create amend with images built on individual architectures

set -e

PUBLISH_IMAGES_LIST=(
  che-theia-dev
  che-theia
  che-theia-endpoint-runtime-binary
  che-theia-vsix-installer
)
SHORT_SHA=$(git rev-parse --short HEAD)-${SUFFIX}
for image in "${PUBLISH_IMAGES_LIST[@]}"; do
    the_image="${REGISTRY}/${ORGANIZATION}/${image}"
    AMEND=""
    AMEND+=" --amend ${the_image}:${TAG}-amd64";
    AMEND+=" --amend ${the_image}:${TAG}-arm64";
    AMEND+=" --amend ${the_image}:${TAG}-ppc64le";
    AMEND+=" --amend ${the_image}:${TAG}-s390x";

    # Create manifest and push multiarch image
    docker manifest create "${the_image}:${TAG}" "$AMEND"
    docker manifest push "${the_image}:${TAG}"
    
    if [[ "${TAG}" == "next-travis" ]]; then
       docker manifest create "${the_image}:${SHORT_SHA}" "$AMEND"
       docker manifest push "${the_image}:${SHORT_SHA}"
	else 
       docker manifest create "${the_image}:latest" "$AMEND"
       docker manifest push "${the_image}:latest"
    fi
done
