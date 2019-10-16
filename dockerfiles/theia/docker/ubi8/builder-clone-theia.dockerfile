# Clone theia and keep source code in home
RUN git clone --branch ${GIT_BRANCH_NAME} --single-branch --depth 1 https://github.com/${THEIA_GITHUB_REPO} ${HOME}/theia-source-code \
    && cd ${HOME}/theia-source-code && git checkout 1d67c3854e65445f0a5f66ce7e25793a51b662e1 && cd ${HOME} && tar zcf ${HOME}/theia-source-code.tgz theia-source-code

