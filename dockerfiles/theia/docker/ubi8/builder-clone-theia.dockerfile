# Clone theia and keep source code in home
RUN git clone --branch ${GIT_BRANCH_NAME} --single-branch https://github.com/${THEIA_GITHUB_REPO} ${HOME}/theia-source-code \
    && cd ${HOME}/theia-source-code && git checkout 1eaecd5cbf93468a74988ddcd347402fcbf14cbe \
    && cd ${HOME} && tar zcf ${HOME}/theia-source-code.tgz theia-source-code