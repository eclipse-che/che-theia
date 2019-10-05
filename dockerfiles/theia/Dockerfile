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
FROM ${BUILD_ORGANIZATION}/${BUILD_PREFIX}-theia-dev:${BUILD_TAG} as builder

${INCLUDE:instructions/${BUILD_IMAGE_TARGET}/builder-setup.env}

${INCLUDE:instructions/builder-compile-theia.run}
${INCLUDE:instructions/builder-make-production.run}
${INCLUDE:instructions/builder-compile-plugins.run}
${INCLUDE:instructions/builder-change-production-permissions.run}

###
# Runtime Image
#

# Use node image
FROM node:10.16-alpine as runtime

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
