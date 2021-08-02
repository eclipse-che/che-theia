RUN apk add --update --no-cache \
    # Download some files
    curl \
    # To play with json in shell
    jq \
    # compile some javascript native stuff (node-gyp)
    make gcc g++ python2 \
    # clone repositories (and also using ssh repositories)
    git openssh openssh-keygen mandoc git-doc \
    # Handle git diff properly
    less \
    # bash shell
    bash \
    # some lib to compile 'native-keymap' npm mpdule
    libx11-dev libxkbfile-dev \
    # synchronization tool
    rsync \
    # patch (required in che-theia to apply patches)
    patch \
    # requirements to build keytar
    libsecret-dev \
    # requirements to run theia with yarn start
    libsecret
