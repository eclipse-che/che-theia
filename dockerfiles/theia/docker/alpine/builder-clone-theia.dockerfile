# Clone theia and keep source code in home
RUN git clone --branch ${GIT_BRANCH_NAME} --single-branch https://github.com/${THEIA_GITHUB_REPO} ${HOME}/theia-source-code && cd ${HOME}/theia-source-code && git checkout 9481af8e21f3be4b2e6658854327d8fa2b390da3
