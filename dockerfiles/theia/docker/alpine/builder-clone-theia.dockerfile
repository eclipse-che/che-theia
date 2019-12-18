# Clone theia and keep source code in home
RUN git clone --branch ${GIT_BRANCH_NAME} --single-branch https://github.com/${THEIA_GITHUB_REPO} ${HOME}/theia-source-code
RUN cd ${HOME}/theia-source-code && git checkout 4c4a1f2e03f0571635b39dafde09ef91029cdbb0