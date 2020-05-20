#!/bin/bash

# update FROM lines in Dockerfiles to the latest base images

# get script
if [[ ! -f /tmp/updateBaseImages.sh ]]; then 
    pushd /tmp >/dev/null || exit
    curl -sSLO https://raw.githubusercontent.com/redhat-developer/codeready-workspaces/master/product/updateBaseImages.sh
    chmod +x updateBaseImages.sh
    popd >/dev/null || exit
fi

# this will attempt to push the change directly, and if it fails, will then 
# try to generate a PR using hub if installed, or simply create a PR branch in origin

for d in $(find $(pwd)/dockerfiles -name "*ockerfile" | grep ubi); do 
    if [[ $(grep access.redhat.com/containers $d) ]]; then 
        f=${d##*/}
        dir=${d%/*}
        /tmp/updateBaseImages.sh -b master -w ${dir} -maxdepth 1 -f $f
    fi
done
