USER root
# Install libsecret-devel on s390x and ppc64le for keytar build (binary included in npm package for x86)
RUN { if [[ $(uname -m) == "s390x" ]]; then LIBSECRET="\
      https://rpmfind.net/linux/fedora-secondary/releases/34/Everything/s390x/os/Packages/l/libsecret-0.20.4-2.fc34.s390x.rpm \
      https://rpmfind.net/linux/fedora-secondary/releases/34/Everything/s390x/os/Packages/l/libsecret-devel-0.20.4-2.fc34.s390x.rpm"; \
    elif [[ $(uname -m) == "ppc64le" ]]; then LIBSECRET="\
      libsecret \
      https://rpmfind.net/linux/centos/8-stream/BaseOS/ppc64le/os/Packages/libsecret-devel-0.18.6-1.el8.ppc64le.rpm"; \
    elif [[ $(uname -m) == "x86_64" ]]; then LIBSECRET="libsecret"; \
    else \
      LIBSECRET=""; echo "Warning: arch $(uname -m) not supported"; \
    fi; } \
    && yum install -y $LIBSECRET curl make cmake gcc gcc-c++ python2 git git-core-doc openssh less bash tar gzip rsync patch \
    && yum -y clean all && rm -rf /var/cache/yum
