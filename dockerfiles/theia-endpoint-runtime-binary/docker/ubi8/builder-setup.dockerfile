ENV NEXE_FLAGS="--asset ${HOME}/pre-assembly-nodejs-static"

COPY --from=custom-nodejs /pre-assembly-nodejs-static ${HOME}/pre-assembly-nodejs-static

USER root
