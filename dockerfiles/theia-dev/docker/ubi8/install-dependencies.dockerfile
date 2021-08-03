USER root
# Install libsecret-devel on s390x and ppc64le for keytar build (binary included in npm package for x86)
RUN yum install -y curl make cmake gcc gcc-c++ python2 git git-core-doc openssh less bash tar gzip rsync patch \
    && { [ $(uname -m) == "s390x" ] && yum install -y \
          https://rpmfind.net/linux/fedora-secondary/releases/34/Everything/s390x/os/Packages/l/libsecret-0.20.4-2.fc34.s390x.rpm \
          https://rpmfind.net/linux/fedora-secondary/releases/34/Everything/s390x/os/Packages/l/libsecret-devel-0.20.4-2.fc34.s390x.rpm || true; } \
    && { [ $(uname -m) == "ppc64le" ] && yum install -y libsecret https://rpmfind.net/linux/centos/8-stream/BaseOS/ppc64le/os/Packages/libsecret-devel-0.18.6-1.el8.ppc64le.rpm || true; } \
    && { [ $(uname -m) == "x86_64" ] && yum install -y libsecret || true; } \
    && yum -y clean all && rm -rf /var/cache/yum
