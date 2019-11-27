# Clone theia and keep source code in home
RUN git clone --branch ${GIT_BRANCH_NAME} --single-branch https://github.com/${THEIA_GITHUB_REPO} ${HOME}/theia-source-code \
    && cd ${HOME}/theia-source-code && git checkout d5ca4f666c9e972e3e9fd8ff479a0c6ff445b9fb && cd ${HOME} && tar zcf ${HOME}/theia-source-code.tgz theia-source-code

