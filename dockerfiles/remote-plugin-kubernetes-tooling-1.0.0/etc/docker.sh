#!/bin/bash

set -e

CMD=$1
if [[ $1 = build ]]; then
    CMD="bud"
fi

buildah $CMD $2 $3 $4 $5 $6 $7 $8 $9
