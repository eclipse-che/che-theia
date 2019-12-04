# Clone theia and keep source code in home
RUN git clone --branch ${GIT_BRANCH_NAME} --single-branch --depth 1 https://github.com/${THEIA_GITHUB_REPO} ${HOME}/theia-source-code
