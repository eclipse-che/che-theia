#!/bin/sh
# Based on: https://github.com/che-incubator/vscode-git/blob/master/src/askpass.sh
CHE_THEIA_GIT_ASKPASS_PIPE=`mktemp`
CHE_THEIA_GIT_ASKPASS_PIPE="$CHE_THEIA_GIT_ASKPASS_PIPE" "$CHE_THEIA_GIT_ASKPASS_NODE" "$CHE_THEIA_GIT_ASKPASS_MAIN" $*
cat $CHE_THEIA_GIT_ASKPASS_PIPE
rm $CHE_THEIA_GIT_ASKPASS_PIPE
