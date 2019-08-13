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

ARG THEIA_GITHUB_REPO=theia-ide/theia

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

#invalidate cashe
ADD https://${GITHUB_TOKEN}:x-oauth-basic@api.github.com/repos/theia-ide/theia/git/refs/head /tmp/branch_info.json
ADD https://${GITHUB_TOKEN}:x-oauth-basic@api.github.com/repos/eclipse/che-theia/git/refs/head /tmp/branch_info.json

# Clone theia
RUN git clone --branch ${GIT_BRANCH_NAME}  --single-branch --depth 1 https://github.com/${THEIA_GITHUB_REPO} /home/workspace

# Grab dependencies
COPY /docker-build/theia-plugin-remote/package.json /home/workspace/examples/assembly/
RUN cd /home/workspace/examples/assembly/ && yarn install --ignore-scripts

# Adding sources
COPY /docker-build/configs /home/workspace/che/configs
COPY /docker-build/configs/tsfmt.json /home/workspace/configs/tsfmt.json
COPY /docker-build/configs/tslint.json /home/workspace/configs/tslint.json
COPY /docker-build/theia-plugin-remote/*.json /home/workspace/examples/assembly/
COPY /docker-build/theia-plugin-remote/src /home/workspace/examples/assembly/src
COPY /docker-build/theia-plugin-ext /home/workspace/che/packages/theia-plugin-ext
COPY /docker-build/theia-plugin /home/workspace/che/packages/theia-plugin

RUN ln -s /home/workspace/che/packages/theia-plugin-ext /home/workspace/packages/theia-plugin-ext
RUN ln -s /home/workspace/che/packages/theia-plugin /home/workspace/packages/theia-plugin

# installing all dependencies
RUN cd /home/workspace/ && yarn

# Run into production mode
RUN cd /home/workspace/ && che:theia production

FROM node:10.16-alpine
ENV HOME=/home/theia
COPY --from=builder /home/workspace/production /home/theia/
RUN rm -rf /home/theia/node_modules/@eclipse-che/theia-plugin-ext /home/theia/node_modules/@eclipse-che/theia-remote
COPY --from=builder /home/workspace/che/packages/theia-plugin-ext /home/theia/node_modules/@eclipse-che/theia-plugin-ext
COPY --from=builder /home/workspace/production/lib /home/theia/lib
RUN mkdir /projects \
    # Store passwd/group as template files
    && cat /etc/passwd | sed s#root:x.*#root:x:\${USER_ID}:\${GROUP_ID}::\${HOME}:/bin/sh#g > ${HOME}/passwd.template \
    && cat /etc/group | sed s#root:x:0:#root:x:0:0,\${USER_ID}:#g > ${HOME}/group.template \
    # Change permissions to let any arbitrary user
    && for f in "${HOME}" "/etc/passwd" "/etc/group" "/projects"; do \
        echo "Changing permissions on ${f}" && chgrp -R 0 ${f} && \
        chmod -R g+rwX ${f}; \
    done
ADD etc/entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]

