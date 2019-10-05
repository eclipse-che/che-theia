# Copyright (c) 2018 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

###
# Builder Image
#
# FROM ${BUILD_ORGANIZATION}/${BUILD_PREFIX}-theia-dev:${BUILD_TAG} as builder
FROM registry-proxy.engineering.redhat.com/rh-osbs/codeready-workspaces-theia-dev-rhel8:2.0 as builder

${INCLUDE:instructions/${BUILD_IMAGE_TARGET}/builder-setup.env}

# patch electron module by removing native keymap module (no need to have some X11 libraries)
RUN line_to_delete=$(grep -n native-keymap dev-packages/electron/package.json | cut -d ":" -f 1) && \
    sed -i -e "${line_to_delete},1d" dev-packages/electron/package.json

${INCLUDE:instructions/builder-compile-theia.run}
${INCLUDE:instructions/builder-make-production.run}
${INCLUDE:instructions/builder-compile-plugins.run}
${INCLUDE:instructions/builder-change-production-permissions.run}

###
# Runtime Image
#

# https://access.redhat.com/containers/?tab=tags#/registry.access.redhat.com/ubi8/nodejs-10
FROM registry.access.redhat.com/ubi8/nodejs-10:1-51

${INCLUDE:instructions/runtime-setup.env}
${INCLUDE:instructions/runtime-ports.expose}

COPY --from=builder /home/theia-dev/theia-source-code/production/plugins /default-theia-plugins

USER root
${INCLUDE:instructions/${BUILD_IMAGE_TARGET}/runtime-install-dependencies.run}

RUN \
    ${INCLUDE:instructions/${BUILD_IMAGE_TARGET}/runtime-adduser.run}
    ${INCLUDE:instructions/${BUILD_IMAGE_TARGET}/runtime-yarninstall.run}

${INCLUDE:instructions/${BUILD_IMAGE_TARGET}/runtime-getplugins.run}

${INCLUDE:instructions/runtime-configure.run}
${INCLUDE:instructions/runtime-theia-production.copy}
${INCLUDE:instructions/runtime-theia.user}
${INCLUDE:instructions/runtime-projects.workdir}
${INCLUDE:instructions/runtime-define.entrypoint}

ENV SUMMARY="Red Hat CodeReady Workspaces - Theia container" \
    DESCRIPTION="Red Hat CodeReady Workspaces - Theia container" \
    PRODNAME="codeready-workspaces" \
    COMPNAME="theia-rhel8" 

LABEL summary="$SUMMARY" \
      description="$DESCRIPTION" \
      io.k8s.description="$DESCRIPTION" \
      io.k8s.display-name="$DESCRIPTION" \
      io.openshift.tags="$PRODNAME,$COMPNAME" \
      com.redhat.component="$PRODNAME-$COMPNAME-container" \
      name="$PRODNAME/$COMPNAME" \
      version="2.0" \
      license="EPLv2" \
      maintainer="Nick Boldt <nboldt@redhat.com>" \
      io.openshift.expose-services="" \
      usage=""
