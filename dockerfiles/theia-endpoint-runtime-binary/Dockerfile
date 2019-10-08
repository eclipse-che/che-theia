# Copyright (c) 2019 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

FROM ${BUILD_ORGANIZATION}/${BUILD_PREFIX}-theia:${BUILD_TAG} as builder

WORKDIR /home/theia

# Apply node libs installed globally to the PATH
ENV PATH=${HOME}/.yarn/bin:${PATH}

RUN yarn global add nexe@3.3.2

RUN nexe -v && \
    # Build remote binary with node runtime 10.16.0 and che-theia node dependencies. nexe icludes to the binary only
    # necessary dependencies.
    nexe node_modules/@eclipse-che/theia-remote/lib/node/plugin-remote.js -t alpine-x64-10.16.0 -o ${HOME}/plugin-remote-endpoint

# Light image without node. We include remote binary to this image.
FROM alpine:3.10.2

COPY --from=builder /home/theia/plugin-remote-endpoint /plugin-remote-endpoint

ENTRYPOINT cp -rf /plugin-remote-endpoint /remote-endpoint/plugin-remote-endpoint
