# Copyright (c) 2019 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

FROM quay.io/eclipse/che-custom-nodejs-deasync:10.19.0-latest as custom-nodejs

FROM #{INCLUDE:docker/${BUILD_IMAGE_TARGET}/builder-from.dockerfile}

WORKDIR /home/theia

# Apply node libs installed globally to the PATH
ENV PATH=${HOME}/.yarn/bin:${PATH}
ENV NEXE_FLAGS="--asset ${HOME}/pre-assembly-nodejs-static"

COPY --from=custom-nodejs /pre-assembly-nodejs-static ${HOME}/pre-assembly-nodejs-static

# setup extra stuff
#{INCLUDE:docker/${BUILD_IMAGE_TARGET}/builder-setup.dockerfile}
RUN yarn global add ${YARN_FLAGS} nexe@3.3.2
RUN nexe -v && \
    # Build remote binary with node runtime 10.16.0 and che-theia node dependencies. nexe icludes to the binary only
    # necessary dependencies.
    nexe node_modules/@eclipse-che/theia-remote/lib/node/plugin-remote.js ${NEXE_FLAGS} -o ${HOME}/plugin-remote-endpoint

# Light image without node. We include remote binary to this image.
#{INCLUDE:docker/${BUILD_IMAGE_TARGET}/runtime-from.dockerfile}
#{INCLUDE:docker/${BUILD_IMAGE_TARGET}/runtime-post-env.dockerfile}

COPY --from=builder /home/theia/plugin-remote-endpoint /plugin-remote-endpoint

ENTRYPOINT cp -rf /plugin-remote-endpoint /remote-endpoint/plugin-remote-endpoint
