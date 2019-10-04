#!/bin/sh
#
# Copyright (c) 2019 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation
#

npm config set prefix "${HOME}/.npm-global"
echo "--global-folder \"${HOME}/.yarn-global\"" > ${HOME}/.yarnrc

# add eclipse che theia generator
yarn global add yo @theia/generator-plugin@0.0.1-1562578105 file:${HOME}/eclipse-che-theia-generator.tgz

# Generate .passwd.template
cat /etc/passwd | sed s#root:x.*#theia-dev:x:\${USER_ID}:\${GROUP_ID}::${HOME}:/bin/bash#g > ${HOME}/.passwd.template && \

# Generate .group.template
cat /etc/group | sed s#root:x:0:#root:x:0:0,\${USER_ID}:#g > ${HOME}/.group.template && \

mkdir /projects

# Define default prompt
echo "export PS1='\[\033[01;33m\](\u@container)\[\033[01;36m\] (\w) \$ \[\033[00m\]'" > ${HOME}/.bashrc

# Disable the statistics for yeoman
mkdir -p ${HOME}/.config/insight-nodejs/
echo '{"optOut": true}' > ${HOME}/.config/insight-nodejs/insight-yo.json
# Change permissions to let any arbitrary user
for f in "${HOME}" "/etc/passwd" "/etc/group" "/projects"; do
  echo "Changing permissions on ${f}"
  chgrp -R 0 ${f}
  chmod -R g+rwX ${f};
done