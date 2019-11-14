RUN apk add --update --no-cache \
    # Download some files
    curl \
    # To play with json in shell
    jq \
    # compile some javascript native stuff (node-gyp)
    make gcc g++ python \
    # clone repositories (and also using ssh repositories)
    git openssh openssh-keygen man git-doc \
    # Handle git diff properly
    less \
    # bash shell
    bash \
    # some lib to compile 'native-keymap' npm mpdule
    libx11-dev libxkbfile-dev
    