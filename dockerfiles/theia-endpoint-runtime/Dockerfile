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


# define in env variable GITHUB_TOKEN only if it is defined
# else check if github rate limit is enough, else will abort requiring to set GITHUB_TOKEN value
ARG GITHUB_TOKEN

# Check github limit
RUN if [ ! -z "${GITHUB_TOKEN-}" ]; then \
        export GITHUB_TOKEN=$GITHUB_TOKEN; \
        echo "Setting GITHUB_TOKEN value as provided"; \
    else \
        export GITHUB_LIMIT=$(curl -s 'https://api.github.com/rate_limit' | jq '.rate .remaining'); \
        echo "Current API rate limit https://api.github.com is ${GITHUB_LIMIT}"; \
        if [ "${GITHUB_LIMIT}" -lt 10 ]; then \
            printf "\033[0;31m\n\n\nRate limit on https://api.github.com is reached so in order to build this image, "; \
            printf "the build argument GITHUB_TOKEN needs to be provided so build will not fail.\n\n\n\033[0m"; \
            exit 1; \
        else \
            echo "GITHUB_TOKEN variable is not set but https://api.github.com rate limit has enough slots"; \
        fi \
    fi

# Grab dependencies
COPY /package.json /home/workspace/packages/theia-remote/
RUN cd /home/workspace/packages/theia-remote/ && yarn install --ignore-scripts

# Compile
COPY /docker-build/configs /home/workspace/configs
COPY *.json /home/workspace/packages/theia-remote/
COPY /src /home/workspace/packages/theia-remote/src
COPY /docker-build/theia-plugin-ext /home/workspace/packages/theia-plugin-ext
COPY /docker-build/theia-plugin /home/workspace/packages/theia-plugin
COPY /tsconfig.json /home/workspace/packages/theia-plugin/tsconfig.json

COPY /etc/package.json /home/workspace
RUN cd /home/workspace/ && yarn install

FROM node:8.15.0-alpine
COPY --from=builder /home/workspace/node_modules /home/theia/node_modules
RUN rm -rf /home/theia/node_modules/@eclipse-che/theia-plugin-ext /home/theia/node_modules/@eclipse-che/theia-remote
COPY --from=builder /home/workspace/packages/theia-plugin-ext /home/theia/node_modules/@eclipse-che/theia-plugin-ext
COPY --from=builder /home/workspace/packages/theia-remote/lib /home/theia/lib
CMD node /home/theia/lib/node/plugin-remote.js
