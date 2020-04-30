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
# Theia dev Image
#
FROM #{INCLUDE:docker/${BUILD_IMAGE_TARGET}/builder-image-from.dockerfile}

# Install packages
#{INCLUDE:docker/${BUILD_IMAGE_TARGET}/install-dependencies.dockerfile}

# setup yarn (if missing)
#{INCLUDE:docker/${BUILD_IMAGE_TARGET}/setup-yarn.dockerfile}

# Add npm global bin directory to the path
ENV HOME=/home/theia-dev \
    PATH=/home/theia-dev/.npm-global/bin:${PATH} \
    # Specify the directory of git (avoid to search at init of Theia)
    USE_LOCAL_GIT=true \
    LOCAL_GIT_DIRECTORY=/usr \
    GIT_EXEC_PATH=/usr/libexec/git-core \
    THEIA_ELECTRON_SKIP_REPLACE_FFMPEG=true \
    ELECTRON_SKIP_BINARY_DOWNLOAD=1 \
    YARN_FLAGS=""

# setup extra stuff
#{INCLUDE:docker/${BUILD_IMAGE_TARGET}/post-env.dockerfile}

# Define package of the theia generator to use
COPY asset-unpacked-generator ${HOME}/eclipse-che-theia-generator

WORKDIR ${HOME}

# Exposing Theia ports
EXPOSE 3000 3030

# Configure npm and yarn to use home folder for global dependencies
RUN npm config set prefix "${HOME}/.npm-global" && \
    echo "--global-folder \"${HOME}/.yarn-global\"" > ${HOME}/.yarnrc && \
    yarn config set network-timeout 600000 -g && \
    # add eclipse che theia generator
    yarn ${YARN_FLAGS} global add yo generator-code vsce @theia/generator-plugin@0.0.1-1562578105 file:${HOME}/eclipse-che-theia-generator && \
    rm -rf ${HOME}/eclipse-che-theia-generator && \
    # Generate .passwd.template \
    cat /etc/passwd | \
    sed s#root:x.*#theia-dev:x:\${USER_ID}:\${GROUP_ID}::${HOME}:/bin/bash#g \
    > ${HOME}/.passwd.template && \
    # Generate .group.template \
    cat /etc/group | \
    sed s#root:x:0:#root:x:0:0,\${USER_ID}:#g \
    > ${HOME}/.group.template && \
    mkdir /projects && \
    # Define default prompt
    echo "export PS1='\[\033[01;33m\](\u@container)\[\033[01;36m\] (\w) \$ \[\033[00m\]'" > ${HOME}/.bashrc  && \
    # Disable the statistics for yeoman
    mkdir -p ${HOME}/.config/insight-nodejs/ && \
    echo '{"optOut": true}' > ${HOME}/.config/insight-nodejs/insight-yo.json && \
    # Change permissions to let any arbitrary user
    for f in "${HOME}" "/etc/passwd" "/etc/group" "/projects"; do \
        echo "Changing permissions on ${f}" && chgrp -R 0 ${f} && \
        chmod -R g+rwX ${f}; \
    done

# post yarn config
#{INCLUDE:docker/${BUILD_IMAGE_TARGET}/post-yarn-config.dockerfile}

WORKDIR /projects

COPY src/entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]

CMD tail -f /dev/null
