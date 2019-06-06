#!/bin/bash
#
# Copyright (c) 2019 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# See: https://sipb.mit.edu/doc/safe-shell/

set -e
set -o pipefail

ask() {
    local prompt default reply

    if [ "${2:-}" = "Y" ]; then
        prompt="Y/n"
        default=Y
    elif [ "${2:-}" = "N" ]; then
        prompt="y/N"
        default=N
    else
        prompt="y/n"
        default=
    fi

    while true; do
        echo -n "$1 [$prompt] "
        read reply </dev/tty

        if [ -z "$reply" ]; then
            reply=$default
        fi
        
        case "$reply" in
            Y*|y*) return 0 ;;
            N*|n*) return 1 ;;
        esac

    done
}

ask_for_change_che_theia_init_baranch () {
    if ask "Do you want to change branch in 'che-theia-init-sources.yml'?" Y; then
        change_change_che_theia_init_baranch
    fi
}

change_change_che_theia_init_baranch () {
    read -p "Enter branch name: "  branchName
    #change che-theia-init-sources.yml
    found="";
    content="";
    while IFS='' read -r line || [[ -n "$line" ]]; do
        # echo "Text read from file: $line";
        if [[ "$line" == *"eclipse/che-theia" ]]; then
            found="true";
        fi
        if [[ ! -z "$found" ]]; then
            if [[ ${line} == *"checkoutTo:"* ]]; then
                line="  checkoutTo: ${branchName}";
                found="";
            fi
        fi
        if [ -z "$content" ]; then
            content="${line}";
        else 
            content="${content}\n${line}";
        fi
    done < "che-theia-init-sources.yml";
    printf "%b\n" "$content" > "che-theia-init-sources.yml";

    sed -i 's~@api.github.com/repos/eclipse/che-theia/git/${GIT_REF}~@api.github.com/repos/eclipse/che-theia/git/refs/heads/'${branchName}'~' ./dockerfiles/theia/Dockerfile 
}

# first is path to dir which contains 'package.json', second is Theia version
updateTheiaDependencies() {
    sed -i -r -e 's/("@theia\/..*": )(".*")/\1"'$2'"/' ./$1/package.json
}


ask_for_change_che_theia_init_baranch

read -p "Enter Theia version : "  theiaVersion

sed -i -e "s/RUN git clone -b 'master'/RUN git clone -b 'v${theiaVersion}'/" ./dockerfiles/theia-dev/e2e/Dockerfile
sed -i -e "s/ARG THEIA_VERSION=..*/ARG THEIA_VERSION=${theiaVersion}" ./dockerfiles/theia/Dockerfile

for dir in extensions/*
do
    echo ${dir}
    updateTheiaDependencies ${dir} ${theiaVersion}
done

for dir in plugins/*
do
    echo ${dir}
    updateTheiaDependencies ${dir} ${theiaVersion}
done

read -p "Enter che-theia image tag [latest]: "  theiaTag
theiaTag="${theiaTag:=latest}"

read -p "Enter Theia branch name [v${theiaVersion}]: "  theiaBranchName
theiaBranchName="${theiaBranchName:=v${theiaVersion}}"

read -p "Enter Theia git refs [refs\\/tags\\/v${theiaVersion}]: "  theiaGitRefs
theiaGitRefs="${theiaGitRefs:="refs\\\\\\\\\\/tags\\\\\\\\\\/v${theiaVersion}"}"

read -p "Enter che-theia image version [${theiaVersion}]: "  cheTheiaVersion
cheTheiaVersion="${cheTheiaVersion:=${theiaVersion}}"

sed -i -e 's/IMAGE_TAG="..*"/IMAGE_TAG="'${theiaTag}'"/' docker_image_build.include
sed -i -e 's/THEIA_VERSION="..*"/THEIA_VERSION="'${theiaVersion}'"/' docker_image_build.include
sed -i -e 's/THEIA_BRANCH="..*"/THEIA_BRANCH="'${theiaBranchName}'"/' docker_image_build.include
sed -i -e 's/THEIA_GIT_REFS="..*"/THEIA_GIT_REFS="'${theiaGitRefs}'"/g' docker_image_build.include
sed -i -e 's/THEIA_DOCKER_IMAGE_VERSION=.*/THEIA_DOCKER_IMAGE_VERSION="'${cheTheiaVersion}'"/' docker_image_build.include

echo "All done..."
