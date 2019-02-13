# Copyright (c) 2019 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

FROM node:8.12-alpine as builder
RUN apk add --no-cache make gcc g++ python

# Grab dependencies
COPY /package.json /home/theia-endpoint/
RUN cd /home/theia-endpoint/ && yarn install --ignore-scripts

# Compile
COPY *.json /home/theia-endpoint/
COPY /src /home/theia-endpoint/src
RUN cd /home/theia-endpoint/ && yarn install

FROM ${BUILD_ORGANIZATION}/${BUILD_PREFIX}-theia-dev:${BUILD_TAG} as eclipse-che-theia-plugin-ext-builder

# Compile
COPY /eclipse-che-theia-plugin-ext /home/eclipse-che-theia-plugin-ext
RUN cd /home/eclipse-che-theia-plugin-ext/ && yarn install

FROM node:8.12-alpine
# Grab runtime
COPY --from=builder /home/theia-endpoint/node_modules /home/theia/node_modules
COPY --from=builder /home/theia-endpoint/lib /home/theia/lib
COPY --from=eclipse-che-theia-plugin-ext-builder /home/eclipse-che-theia-plugin-ext /home/theia/node_modules/@eclipse-che/theia-plugin-ext
CMD node /home/theia/lib/node/plugin-remote.js
