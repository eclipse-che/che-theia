ENV NEXE_FLAGS="--target 'alpine-x64-14' --temp /tmp/nexe-cache"

COPY --from=custom-nodejs /alpine-x64-14 /tmp/nexe-cache/alpine-x64-14

USER root
