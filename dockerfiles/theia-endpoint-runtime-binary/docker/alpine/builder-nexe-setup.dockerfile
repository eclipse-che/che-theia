# install specific nexe
WORKDIR /tmp
RUN git clone https://github.com/nexe/nexe
WORKDIR /tmp/nexe
RUN git checkout ${NEXE_SHA1} && npm install && npm run build
# Change back to root folder
WORKDIR /home/theia
