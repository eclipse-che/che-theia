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

# Create a struct from the given content which should be a flattened devfile
# parameter: $1 is the content of the file to analyze
# return: Array of object containing: name, env and extensions fields
analyze_flattened_devfile() {
    echo "$1" | yq -c '.components[] | select(.attributes."che-theia.eclipse.org/vscode-extensions") | [{name:(.attributes."app.kubernetes.io/name" // "theia"), env:(.container.env), extensions:(.attributes."che-theia.eclipse.org/vscode-extensions")}]'
}

# extract the name of the component from one item of the analyze
# parameter: $1 is the component data item
extract_component_name_from_item() {
  jq -n "$1" | jq -r '.[].name'
}

# extract the destination folder from one item of the analyze
# parameter: $1 is the component data item
extract_dest_from_item() {
  # also remove the local-dir:// prefix
  jq -n "$1" | jq -r '.[].env[] | select(.name == "THEIA_PLUGINS") | .value' | sed 's|local-dir://\([^"][^"]*\)|\1|'
}

# extract the urls from one item of the analyze
# parameter: $1 is the component data item
extract_urls_from_item() {
  # URLs are wrapped into extensions custom field
  # transform it into a space separated list
  jq -n "$1" | jq -r -c '.[].extensions | @sh' | sed -e "s/'//g"
}



processDevWorkspacePlugins() {
  # Create a struct from the flattened devfile
  # Array of object containing: name, env and extensions fields
  flattenedDevfile=$(cat "/devworkspace-metadata/flattened.devworkspace.yaml")
  vsixPerComponents=$(analyze_flattened_devfile "$flattenedDevfile")
  IFS=$'\n' 
  for componentData in $vsixPerComponents; do
  
    # Component is in the name
    componentName=$(extract_component_name_from_item "$componentData")
  
    # Destination Folder is defined by THEIA_PLUGINS value
    dest=$(extract_dest_from_item "$componentData")
    mkdir -p "$dest"
    if ls -A "${dest}"/*.vsix 2> /dev/null ; then
      echo "VSIX files are already in folder ${dest}, skipping the download"
      return 0
    fi
  
    # URLs are wrapped into extensions custom field
    # transform it into a space separated list
    urls=$(extract_urls_from_item "$componentData")
  
    for url in $urls; do
      CURL_OPTIONS=""
      # check if URL starts with relative:extension/
      # example of url: "relative:extension/resources/download_jboss_org/jbosstools/static/jdt_ls/stable/java-0.75.0-60.vsix
      if [[ "$url" =~ ^relative:extension/.* ]]; then
        # if there is CHE_PLUGIN_REGISTRY_INTERNAL_URL env var, use it
        if [ -n "$CHE_PLUGIN_REGISTRY_INTERNAL_URL" ]; then
          # update URL by using the Plugin Registry internal URL as prefix
          url=${CHE_PLUGIN_REGISTRY_INTERNAL_URL}/${url#relative:extension/}
        elif [ -n "$CHE_PLUGIN_REGISTRY_URL" ]; then
          # if there is CHE_PLUGIN_REGISTRY_URL env var, use it but also use insecure
          # options as we don't have all certificates in a devWorkspace for now
          CURL_OPTIONS="--insecure"
          # update URL by using the Plugin Registry internal URL as prefix
          url=${CHE_PLUGIN_REGISTRY_URL}/${url#relative:extension/}
        else
          echo "no plugin registry URL env var is set (CHE_PLUGIN_REGISTRY_INTERNAL_URL or CHE_PLUGIN_REGISTRY_URL), skipping relative url ${url}"
          continue
        fi
      fi
      echo; echo "downloading $url to $dest for component $componentName"
      curl ${CURL_OPTIONS} -L "$url" > "$dest/$(basename "$url")"
    done;
  done;
}

# main function
run_main() {
  if [ -n "$DEVWORKSPACE_NAMESPACE" ]; then
    processDevWorkspacePlugins
  fi

  cp -rf /plugin-remote-endpoint /remote-endpoint/plugin-remote-endpoint
}

# do not execute the main function in unit tests
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]
then
    run_main "${@}"
fi
