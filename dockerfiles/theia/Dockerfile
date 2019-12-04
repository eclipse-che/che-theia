# Copyright (c) 2018-2019 Red Hat, Inc.
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
FROM #{INCLUDE:docker/${BUILD_IMAGE_TARGET}/builder-from.dockerfile}

WORKDIR ${HOME}

# Export GITHUB_TOKEN into environment variable
ARG GITHUB_TOKEN=''
ENV GITHUB_TOKEN=$GITHUB_TOKEN

ARG THEIA_GITHUB_REPO=eclipse-theia/theia

# Define upstream version of theia to use
ARG THEIA_VERSION=master

ENV NODE_OPTIONS="--max-old-space-size=4096"

#{IF:DO_REMOTE_CHECK}
# Invalidate cache if any source code has changed
ADD https://${GITHUB_TOKEN}:x-oauth-basic@api.github.com/repos/${THEIA_GITHUB_REPO}/git/${GIT_REF} /tmp/branch_info.json
#ENDIF

# Clone theia
#{INCLUDE:docker/${BUILD_IMAGE_TARGET}/builder-clone-theia.dockerfile}
#{INCLUDE:docker/${BUILD_IMAGE_TARGET}/builder-post-clone.dockerfile}

# Patch theia
#{INCLUDE:docker/${BUILD_IMAGE_TARGET}/builder-patch-theia.dockerfile}
#{INCLUDE:docker/${BUILD_IMAGE_TARGET}/builder-post-patch.dockerfile}

# Generate che-theia
ARG CDN_PREFIX=""
ARG MONACO_CDN_PREFIX=""
WORKDIR ${HOME}/theia-source-code

# Add che-theia repository content
COPY asset-che-theia.tar.gz /tmp/asset-che-theia.tar.gz
RUN mkdir -p ${HOME}/theia-source-code/che-theia/ && tar xzf /tmp/asset-che-theia.tar.gz -C ${HOME}/theia-source-code/che-theia/ && rm /tmp/asset-che-theia.tar.gz

# run che:theia init command and alias che-theia repository to use local sources insted of cloning
RUN che:theia init -c ${HOME}/theia-source-code/che-theia/che-theia-init-sources.yml --alias https://github.com/eclipse/che-theia=${HOME}/theia-source-code/che-theia

# cleanup theia folders that we don't need to compile
RUN rm -rf ${HOME}/theia-source-code/examples/browser && \
    rm -rf ${HOME}/theia-source-code/examples/electron && \
    rm -rf ${HOME}/theia-source-code/packages/cpp && \
    rm -rf ${HOME}/theia-source-code/packages/git && \
    rm -rf ${HOME}/theia-source-code/packages/java && \
    rm -rf ${HOME}/theia-source-code/packages/java-debug && \
    rm -rf ${HOME}/theia-source-code/packages/python && \
    rm -rf ${HOME}/theia-source-code/packages/scm && \
    rm -rf ${HOME}/theia-source-code/packages/typescript && \
    # Remove linter/formatters
    sed -i 's|concurrently -n compile,lint -c blue,green \\"theiaext compile\\" \\"theiaext lint\\"|concurrently -n compile -c blue \\"theiaext compile\\"|' ${HOME}/theia-source-code/dev-packages/ext-scripts/package.json && \
    find ${HOME}/theia-source-code/che-theia -name "package.json" | xargs sed -i 's|concurrently -n \\"format,lint,compile\\" -c \\"red,green,blue\\" \\"yarn format\\" \\"yarn lint\\" \\"yarn compile\\"|concurrently -n \\"compile\\" -c \\"blue\\" \\"yarn compile\\"|'

RUN che:theia cdn --theia="${CDN_PREFIX}" --monaco="${MONACO_CDN_PREFIX}"

# Compile Theia
#{INCLUDE:docker/${BUILD_IMAGE_TARGET}/builder-before-compile.dockerfile}

# Unset GITHUB_TOKEN environment variable if it is empty.
# This is needed for some tools which use this variable and will fail with 401 Unauthorized error if it is invalid.
# For example, vscode ripgrep downloading is an example of such case.
RUN if [ -z $GITHUB_TOKEN ]; then unset GITHUB_TOKEN; fi && \
    yarn ${YARN_FLAGS}

# Run into production mode
#{INCLUDE:docker/${BUILD_IMAGE_TARGET}/builder-before-production.dockerfile}
RUN che:theia production

# Compile plugins
RUN if [ -z $GITHUB_TOKEN ]; then unset GITHUB_TOKEN; fi && \
    cd plugins && ./foreach_yarn

# Add yeoman generator & vscode git plug-ins
COPY asset-untagged-c11870b25a17d20bb7a7-theia_yeoman_plugin.theia /home/theia-dev/theia-source-code/production/plugins/theia_yeoman_plugin.theia
COPY asset-vscode-git-1.3.0.1.vsix /home/theia-dev/theia-source-code/production/plugins/vscode-git-1.3.0.1.vsix

# change permissions
RUN find production -exec sh -c "chgrp 0 {}; chmod g+rwX {}" \; 2>log.txt


###
# Runtime Image
#

# Use node image
#{INCLUDE:docker/${BUILD_IMAGE_TARGET}/runtime-from.dockerfile}

ENV USE_LOCAL_GIT=true \
    HOME=/home/theia \
    SHELL=/bin/bash \
    THEIA_DEFAULT_PLUGINS=local-dir:///default-theia-plugins \
    # Specify the directory of git (avoid to search at init of Theia)
    LOCAL_GIT_DIRECTORY=/usr \
    GIT_EXEC_PATH=/usr/libexec/git-core \
    # Ignore from port plugin the default hosted mode port
    PORT_PLUGIN_EXCLUDE_3130=TRUE \
    YARN_FLAGS=""

# setup extra stuff
#{INCLUDE:docker/${BUILD_IMAGE_TARGET}/runtime-post-env.dockerfile}

EXPOSE 3100 3130

COPY --from=builder /home/theia-dev/theia-source-code/production/plugins /default-theia-plugins

#{INCLUDE:docker/${BUILD_IMAGE_TARGET}/runtime-install-dependencies.dockerfile}

# setup yarn (if missing)
#{INCLUDE:docker/${BUILD_IMAGE_TARGET}/runtime-setup-yarn.dockerfile}

 RUN \
    #{INCLUDE:docker/${BUILD_IMAGE_TARGET}/runtime-adduser.sh}
    && echo "%wheel ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers \
    # Create /projects for Che
    && mkdir /projects \
    # Create root node_modules in order to not use node_modules in each project folder
    && mkdir /node_modules \
    && for f in "${HOME}" "/etc/passwd" "/etc/group /node_modules /default-theia-plugins /projects"; do\
           sudo chgrp -R 0 ${f} && \
           sudo chmod -R g+rwX ${f}; \
       done \
    && cat /etc/passwd | sed s#root:x.*#root:x:\${USER_ID}:\${GROUP_ID}::\${HOME}:/bin/bash#g > ${HOME}/passwd.template \
    && cat /etc/group | sed s#root:x:0:#root:x:0:0,\${USER_ID}:#g > ${HOME}/group.template \
    # Add yeoman, theia plugin & VS Code generator and typescript (to have tsc/typescript working)
    && yarn global add ${YARN_FLAGS} yo @theia/generator-plugin@0.0.1-1562578105 generator-code typescript@3.5.3 \
    && mkdir -p ${HOME}/.config/insight-nodejs/ \
    && chmod -R 777 ${HOME}/.config/ \
    # Disable the statistics for yeoman
    && echo '{"optOut": true}' > $HOME/.config/insight-nodejs/insight-yo.json \
    #{IF:DO_CLEANUP}
    # Link yarn global modules for yeoman
    && local_modules=$(ls -d1 /usr/*/node_modules 2>/dev/null || ls -d1 /usr/*/*/node_modules) \
    && mv ${local_modules}/* /usr/local/share/.config/yarn/global/node_modules && rm -rf ${local_modules} && ln -s /usr/local/share/.config/yarn/global/node_modules $(dirname ${local_modules})/ \
    # Cleanup tmp folder
    && rm -rf /tmp/* \
    # Cleanup yarn cache
    && yarn cache clean \
    #ENDIF
    # Change permissions to allow editing of files for openshift user
    && find ${HOME} -exec sh -c "chgrp 0 {}; chmod g+rwX {}" \;

COPY --chown=theia:root --from=builder /home/theia-dev/theia-source-code/production /home/theia
USER theia
WORKDIR /projects
COPY src/entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
