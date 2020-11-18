ENV NEXE_FLAGS="--target 'alpine-x64-12' --temp /tmp/nexe-cache"

COPY --from=custom-nodejs /alpine-x64-12 /tmp/nexe-cache/alpine-x64-12
