#!/bin/sh
#
# Copyright (c) 2018-2019 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation
#

export USER_ID=$(id -u)
export GROUP_ID=$(id -g)

if ! grep -Fq "${USER_ID}" /etc/passwd; then
    # current user is an arbitrary
    # user (its uid is not in the
    # container /etc/passwd). Let's fix that
    sed -e "s/\${USER_ID}/${USER_ID}/g" \
        -e "s/\${GROUP_ID}/${GROUP_ID}/g" \
        -e "s/\${HOME}/\/home\/theia/g" \
        /.passwd.template > /etc/passwd

    sed -e "s/\${USER_ID}/${USER_ID}/g" \
        -e "s/\${GROUP_ID}/${GROUP_ID}/g" \
        -e "s/\${HOME}/\/home\/theia/g"
        /.group.template > /etc/group
fi

# Grant access to projects volume in case of non root user with sudo rights
if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1 && sudo -n true > /dev/null 2>&1; then
    sudo chmod 644 /etc/passwd /etc/group
    sudo chown root:root /etc/passwd /etc/group

    sudo chown ${USER_ID}:${GROUP_ID} /projects "${HOME}"
fi

# SITTERM / SIGINT
responsible_shutdown() {
  echo ""
  echo "Received SIGTERM"
  kill -SIGINT ${PID}
  wait ${PID}
  exit;
}

set -e

# setup handlers
# on callback, kill the last background process, which is `tail -f /dev/null` and execute the specified handler
trap 'responsible_shutdown' SIGHUP SIGTERM SIGINT

cd ${HOME}

# run theia endpoint
node /home/theia/lib/node/plugin-remote.js &

PID=$!

# See: http://veithen.github.io/2014/11/16/sigterm-propagation.html
wait ${PID}
wait ${PID}
EXIT_STATUS=$?

# wait forever
while true
do
  tail -f /dev/null & wait ${!}
done
