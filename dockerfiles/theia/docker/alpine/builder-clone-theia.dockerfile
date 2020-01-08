# Clone theia and keep source code in home
RUN git clone --branch ${GIT_BRANCH_NAME} --single-branch https://github.com/${THEIA_GITHUB_REPO} ${HOME}/theia-source-code
RUN cd ${HOME}/theia-source-code && git checkout 39d6cc67d8a8a97036886ab15d0852cf0094c61d
