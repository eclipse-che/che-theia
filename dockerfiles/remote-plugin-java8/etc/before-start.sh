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

[ ! -z "$MAVEN_MIRROR_URL" ] && set_maven_mirror
return 0
