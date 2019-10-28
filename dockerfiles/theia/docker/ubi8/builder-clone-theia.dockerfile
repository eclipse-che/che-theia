# Clone theia and keep source code in home
RUN git clone --branch ${GIT_BRANCH_NAME} --single-branch --depth 1 https://github.com/${THEIA_GITHUB_REPO} ${HOME}/theia-source-code \
    && cd ${HOME}/theia-source-code && git checkout f255f5a8cb22010aacb8196c8a8f248e111e9945 \
    && cd ${HOME} && tar zcf ${HOME}/theia-source-code.tgz theia-source-code

