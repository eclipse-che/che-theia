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
CURRENT_DIR=$(cd "$(dirname "$0")"; pwd)
TESTS_DIR="$CURRENT_DIR/_data"

# shellcheck disable=SC1090
source "${CURRENT_DIR}/../src/entrypoint.sh"


function assertEquals() {
    if [[ "$1" != "$2" ]]; then
        echo -e "assertEquals failed!"
        echo "Result:"
        echo "$1"
        echo "Expected:"
        echo "$2"
        exit 1
    fi
}

# $1 item being lines
# $2 the expected size
function assertSize() {
  length=$(echo "$1" | wc -l)

  if [[ "$length" != "$2" ]]; then
        echo -e "assertSize failed!"
        echo "Result:"
        echo "$length"
        echo "Expected length:"
        echo "$2"
        exit 1
    fi
}



# Check the analyze
FILE1=$(cat "$TESTS_DIR/flattened_devfile.yaml")

ANALYZE1=$(analyze_flattened_devfile "$FILE1")

# expect two items
assertSize "$ANALYZE1" 2

# Grab first item
FIRST_ITEM=$(echo "$ANALYZE1" | head -n1)

# Check item name
itemName1=$(extract_component_name_from_item "$FIRST_ITEM")
assertEquals "$itemName1" "theia"

# Check dest folder
itemDest1=$(extract_dest_from_item "$FIRST_ITEM")
assertEquals "$itemDest1" "/plugins"

# Check urls
itemUrls1=$(extract_urls_from_item "$FIRST_ITEM")
assertEquals "$itemUrls1" "https://download.jboss.org/jbosstools/vscode/3rdparty/vscode-eslint/vscode-eslint-2.1.1-1e15d3.vsix https://download.jboss.org/jbosstools/vscode/3rdparty/vscode-eslint/vscode-2.vsix"

# Grab second item
SECOND_ITEM=$(echo "$ANALYZE1" | tail -n 1 | head -n1)

# Check item name
itemName2=$(extract_component_name_from_item "$SECOND_ITEM")
assertEquals "$itemName2" "nodejs"

# Check dest folder
itemDest2=$(extract_dest_from_item "$SECOND_ITEM")
assertEquals "$itemDest2" "/plugins/sidecars/nodejs"

# Check urls (none)
itemUrls2=$(extract_urls_from_item "$SECOND_ITEM")
assertEquals "$itemUrls2" ""
