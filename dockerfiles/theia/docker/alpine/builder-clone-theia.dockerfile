RUN git clone --branch ${GIT_BRANCH_NAME} --single-branch https://github.com/${THEIA_GITHUB_REPO} ${HOME}/theia-source-code
RUN cd ${HOME}/theia-source-code && git checkout 1d67c3854e65445f0a5f66ce7e25793a51b662e1
