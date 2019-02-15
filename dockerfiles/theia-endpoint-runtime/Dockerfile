# Copyright (c) 2019 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

FROM ${BUILD_ORGANIZATION}/${BUILD_PREFIX}-theia-dev:${BUILD_TAG} as builder


# Grab dependencies
COPY /package.json /home/workspace/packages/theia-remote/
RUN cd /home/workspace/packages/theia-remote/ && yarn install --ignore-scripts

# Compile
COPY *.json /home/workspace/packages/theia-remote/
COPY /src /home/workspace/packages/theia-remote/src
COPY /theia-plugin-ext /home/workspace/packages/theia-plugin-ext

COPY /etc/package.json /home/workspace
RUN cd /home/workspace/ && yarn install

FROM node:8.12-alpine
COPY --from=builder /home/workspace/node_modules /home/theia/node_modules
RUN rm -rf /home/theia/node_modules/@eclipse-che/theia-plugin-ext /home/theia/node_modules/@eclipse-che/theia-remote
COPY --from=builder /home/workspace/packages/theia-plugin-ext /home/theia/node_modules/@eclipse-che/theia-plugin-ext
COPY --from=builder /home/workspace/packages/theia-remote/lib /home/theia/lib
CMD node /home/theia/lib/node/plugin-remote.js
