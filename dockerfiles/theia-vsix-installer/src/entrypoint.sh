#!/bin/bash
#
# Copyright (c) 2021 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation
#
KUBE_API_ENDPOINT="https://kubernetes.default.svc/apis/workspace.devfile.io/v1alpha2/namespaces/${DEVWORKSPACE_NAMESPACE}/devworkspaces/${DEVWORKSPACE_NAME}"
TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
WORKSPACE=$(curl -fsS --cacert /var/run/secrets/kubernetes.io/serviceaccount/ca.crt -H "Authorization: Bearer ${TOKEN}" "$KUBE_API_ENDPOINT")
IFS=$'\n'
for container in $(echo "$WORKSPACE" | sed -e 's|[[,]\({"attributes":{"app.kubernetes.io\)|\n\1|g' | grep '"che-theia.eclipse.org/vscode-extensions":' | grep -e '^{"attributes".*'); do
    dest=$(echo "$container" | sed 's|.*{"name":"THEIA_PLUGINS","value":"local-dir://\([^"][^"]*\)"}.*|\1|' - )
    urls=$(echo "$container" | sed 's|.*"che-theia.eclipse.org/vscode-extensions":\[\([^]][^]]*\)\].*|\1|' - )
    mkdir -p "$dest"
    unset IFS
    for url in $(echo "$urls" | sed 's/[",]/ /g' - ); do
        echo; echo "downloading $urls to $dest"
        curl -L "$url" > "$dest/$(basename "$url")"
    done
done
