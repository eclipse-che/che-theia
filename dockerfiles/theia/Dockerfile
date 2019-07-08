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
WORKDIR ${HOME}

# define in env variable GITHUB_TOKEN only if it is defined
# else check if github rate limit is enough, else will abort requiring to set GITHUB_TOKEN value
ARG GITHUB_TOKEN

ARG THEIA_GITHUB_REPO=theia-ide/theia

# Define upstream version of theia to use
ARG THEIA_VERSION=master

ENV NODE_OPTIONS="--max-old-space-size=4096"

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

#invalidate cache
ADD https://${GITHUB_TOKEN}:x-oauth-basic@api.github.com/repos/${THEIA_GITHUB_REPO}/git/${GIT_REF} /tmp/branch_info.json

# Clone theia
RUN git clone --branch ${GIT_BRANCH_NAME}  --single-branch --depth 1 https://github.com/${THEIA_GITHUB_REPO} ${HOME}/theia-source-code

# Add patches
ADD src/patches ${HOME}/patches

# Apply patches
RUN if [ -d "${HOME}/patches/${THEIA_VERSION}" ]; then \
      echo "Applying patches for Theia version ${THEIA_VERSION}"; \
      for file in $(find "${HOME}/patches/${THEIA_VERSION}" -name '*.patch'); do \
        echo "Patching with ${file}"; \
        cd ${HOME}/theia-source-code && patch -p1 < ${file}; \
      done \
    fi

# Generate che-theia
ARG CDN_PREFIX=""
ARG MONACO_CDN_PREFIX=""
WORKDIR ${HOME}/theia-source-code

COPY che-theia/che-theia-init-sources.yml ${HOME}/che-theia-init-sources.yml

#invalidate cache for che-theia extensions
ADD https://${GITHUB_TOKEN}:x-oauth-basic@api.github.com/repos/eclipse/che-theia/git/${GIT_REF} /tmp/this_branch_info.json

RUN che:theia init -c ${HOME}/che-theia-init-sources.yml

RUN che:theia cdn --theia="${CDN_PREFIX}" --monaco="${MONACO_CDN_PREFIX}"

# Compile Theia
RUN yarn

# Run into production mode
RUN che:theia production

# FIX ME, temporary fix to restore build
RUN cd che/che-theia && git reset --hard

# Compile plugins
RUN cd plugins && ./foreach_yarn

# change permissions
RUN find production -exec sh -c "chgrp 0 {}; chmod g+rwX {}" \; 2>log.txt


###
# Runtime Image
#
# Use node image
FROM node:10.16-alpine as runtime
ENV USE_LOCAL_GIT=true \
    HOME=/home/theia \
    THEIA_DEFAULT_PLUGINS=local-dir:///default-theia-plugins \
    # Specify the directory of git (avoid to search at init of Theia)
    LOCAL_GIT_DIRECTORY=/usr \
    GIT_EXEC_PATH=/usr/libexec/git-core \
    # Ignore from port plugin the default hosted mode port
    PORT_PLUGIN_EXCLUDE_3130=TRUE

EXPOSE 3100 3130

COPY --from=builder /home/theia-dev/theia-source-code/production/plugins /default-theia-plugins

# Install sudo
# Install git
# Install bzip2 to unpack files
# Install which tool in order to search git
# Install curl and bash
# Install ssh for cloning ssh-repositories
# Install less for handling git diff properly
RUN apk add --update --no-cache sudo git bzip2 which bash curl openssh openssh-keygen less
RUN adduser -D -S -u 1001 -G root -h ${HOME} -s /bin/sh theia \
    && echo "%wheel ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers \
    # Create /projects for Che
    && mkdir /projects \
    # Create root node_modules in order to not use node_modules in each project folder
    && mkdir /node_modules \
    # Download yeoman generator plug-in
    && curl -L -o /default-theia-plugins/theia_yeoman_plugin.theia https://github.com/eclipse/theia-yeoman-plugin/releases/download/untagged-c11870b25a17d20bb7a7/theia_yeoman_plugin.theia \
    # Download vscode git plug-in
    && curl -L -o /default-theia-plugins/vscode-git-1.3.0.1.vsix https://github.com/che-incubator/vscode-git/releases/download/1.30.1/vscode-git-1.3.0.1.vsix \
    && for f in "${HOME}" "/etc/passwd" "/etc/group /node_modules /default-theia-plugins /projects"; do\
           sudo chgrp -R 0 ${f} && \
           sudo chmod -R g+rwX ${f}; \
       done \
    && cat /etc/passwd | sed s#root:x.*#root:x:\${USER_ID}:\${GROUP_ID}::\${HOME}:/bin/bash#g > ${HOME}/passwd.template \
    && cat /etc/group | sed s#root:x:0:#root:x:0:0,\${USER_ID}:#g > ${HOME}/group.template \
    # Add yeoman, theia plugin generator and typescript (to have tsc/typescript working)
    && yarn global add yo @theia/generator-plugin@0.0.1-1562578105 typescript@2.9.2 \
    && mkdir -p ${HOME}/.config/insight-nodejs/ \
    && chmod -R 777 ${HOME}/.config/ \
    # Disable the statistics for yeoman
    && echo '{"optOut": true}' > $HOME/.config/insight-nodejs/insight-yo.json \
    # Link yarn global modules for yeoman
    && mv /usr/local/lib/node_modules/* /usr/local/share/.config/yarn/global/node_modules && rm -rf /usr/local/lib/node_modules && ln -s /usr/local/share/.config/yarn/global/node_modules /usr/local/lib/ \
    # Cleanup tmp folder
    && rm -rf /tmp/* \
    # Cleanup yarn cache
    && yarn cache clean \
    # Change permissions to allow editing of files for openshift user
    && find ${HOME} -exec sh -c "chgrp 0 {}; chmod g+rwX {}" \;

COPY --chown=theia:root --from=builder /home/theia-dev/theia-source-code/production /home/theia
USER theia
WORKDIR /projects
ADD src/entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
