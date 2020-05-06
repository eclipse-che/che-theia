RUN yarn ${YARN_FLAGS} global add yo generator-code vsce @theia/generator-plugin@0.0.1-1562578105 \
    file:${HOME}/eclipse-che-theia-generator && \
    rm -rf ${HOME}/eclipse-che-theia-generator
