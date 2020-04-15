# Clone theia and keep source code in home
RUN git clone --branch ${GIT_BRANCH_NAME} --single-branch https://github.com/${THEIA_GITHUB_REPO} ${HOME}/theia-source-code && cd ${HOME}/theia-source-code && git checkout d0e00c5d07ec0c95a17da51a5b744934d7c4d1f8 && cd ${HOME} && tar zcf ${HOME}/theia-source-code.tgz theia-source-code
