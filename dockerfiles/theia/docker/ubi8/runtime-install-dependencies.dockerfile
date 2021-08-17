# need root user
USER root

ARG SSHPASS_VERSION="1.08"

# Install sudo
# Install git
# Install bzip2 to unpack files
# Install which tool in order to search git
# Install curl and bash
# Install ssh for cloning ssh-repositories
# Install less for handling git diff properly
# Install sshpass for handling passwords for SSH keys
# Install libsecret as Theia requires it
# Install libsecret-devel on s390x and ppc64le for keytar build (binary included in npm package for x86)
RUN yum list --installed libsecret-devel 2>&1 && yum list --installed libsecret 2>&1 || \
    { if [[ $(uname -m) == "s390x" ]]; then LIBSECRET="\
      https://rpmfind.net/linux/fedora-secondary/releases/34/Everything/s390x/os/Packages/l/libsecret-0.20.4-2.fc34.s390x.rpm \
      https://rpmfind.net/linux/fedora-secondary/releases/34/Everything/s390x/os/Packages/l/libsecret-devel-0.20.4-2.fc34.s390x.rpm"; \
    elif [[ $(uname -m) == "ppc64le" ]]; then LIBSECRET="\
      libsecret \
      https://rpmfind.net/linux/centos/8-stream/BaseOS/ppc64le/os/Packages/libsecret-devel-0.18.6-1.el8.ppc64le.rpm"; \
    elif [[ $(uname -m) == "x86_64" ]]; then LIBSECRET="libsecret"; \
    else \
      LIBSECRET=""; echo "Warning: arch $(uname -m) not supported"; \
    fi; } \
    && yum install -y $LIBSECRET sudo git bzip2 which bash curl openssh less \
    && curl -sSLo sshpass.tar.gz https://downloads.sourceforge.net/project/sshpass/sshpass/"${SSHPASS_VERSION}"/sshpass-"${SSHPASS_VERSION}".tar.gz \
    && tar -xvf sshpass.tar.gz && cd sshpass-"${SSHPASS_VERSION}" && ./configure && make install && cd .. && rm -rf sshpass-"${SSHPASS_VERSION}" \
    && yum -y clean all && rm -rf /var/cache/yum
