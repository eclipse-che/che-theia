RUN git clone --branch ${GIT_BRANCH_NAME} --single-branch https://github.com/${THEIA_GITHUB_REPO} ${HOME}/theia-source-code
RUN cd ${HOME}/theia-source-code && git checkout f255f5a8cb22010aacb8196c8a8f248e111e9945
