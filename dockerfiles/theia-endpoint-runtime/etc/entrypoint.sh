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

set_maven_mirror() {
    local m2="$HOME"/.m2
    local settingsXML="$m2"/settings.xml

    [ ! -d "$m2" ] && mkdir -p "$m2"

    if [ ! -f "$settingsXML" ]; then
        echo "<settings xmlns=\"http://maven.apache.org/SETTINGS/1.0.0\"" >> "$settingsXML"
        echo "  xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"" >> "$settingsXML"
        echo "  xsi:schemaLocation=\"http://maven.apache.org/SETTINGS/1.0.0" >> "$settingsXML"
        echo "                      https://maven.apache.org/xsd/settings-1.0.0.xsd\">" >> "$settingsXML"
        echo "  <mirrors>" >> "$settingsXML"
        echo "    <mirror>" >> "$settingsXML"
        echo "      <url>\${env.MAVEN_MIRROR_URL}</url>" >> "$settingsXML"
        echo "      <mirrorOf>external:*</mirrorOf>" >> "$settingsXML"
        echo "    </mirror>" >> "$settingsXML"
        echo "  </mirrors>" >> "$settingsXML"
        echo "</settings>" >> "$settingsXML"
    else
        if ! grep -q "<url>\${env.MAVEN_MIRROR_URL}</url>" "$settingsXML"; then
            if grep -q "<mirrors>" "$settingsXML"; then
                sed -i 's/<mirrors>/<mirrors>\n    <mirror>\n      <url>${env.MAVEN_MIRROR_URL}<\/url>\n      <mirrorOf>external:\*<\/mirrorOf>\n    <\/mirror>/' "$settingsXML"
            else
                sed -i 's/<\/settings>/  <mirrors>\n    <mirror>\n      <url>${env.MAVEN_MIRROR_URL}<\/url>\n      <mirrorOf>external:*<\/mirrorOf>\n    <\/mirror>\n  <\/mirrors>\n<\/settings>/' "$settingsXML"
            fi
        fi
    fi
}

export USER_ID=$(id -u)
export GROUP_ID=$(id -g)

if ! grep -Fq "${USER_ID}" /etc/passwd; then
    # current user is an arbitrary
    # user (its uid is not in the
    # container /etc/passwd). Let's fix that
    cat ${HOME}/passwd.template | \
    sed "s/\${USER_ID}/${USER_ID}/g" | \
    sed "s/\${GROUP_ID}/${GROUP_ID}/g" | \
    sed "s/\${HOME}/\/home\/theia/g" > /etc/passwd

    cat ${HOME}/group.template | \
    sed "s/\${USER_ID}/${USER_ID}/g" | \
    sed "s/\${GROUP_ID}/${GROUP_ID}/g" | \
    sed "s/\${HOME}/\/home\/theia/g" > /etc/group
fi

# Grant access to projects volume in case of non root user with sudo rights
if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1 && sudo -n true > /dev/null 2>&1; then
    sudo chown ${USER_ID}:${GROUP_ID} /projects
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

# generate settings.xml if needed
[ ! -z "$MAVEN_MIRROR_URL" ] && set_maven_mirror

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
