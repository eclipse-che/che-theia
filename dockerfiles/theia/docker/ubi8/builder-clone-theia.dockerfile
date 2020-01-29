# Clone theia and keep source code in home
RUN git clone --branch ${GIT_BRANCH_NAME} --single-branch https://github.com/${THEIA_GITHUB_REPO} ${HOME}/theia-source-code \
    && cd ${HOME}/theia-source-code && git checkout e1d08d00fa2ad8dcfcbfe40393107e51cd436ae5 \
    && cd ${HOME} && tar zcf ${HOME}/theia-source-code.tgz theia-source-code
