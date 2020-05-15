# need root user
USER root

# Install sudo
# Install git
# Install bzip2 to unpack files
# Install which tool in order to search git
# Install curl and bash
# Install ssh for cloning ssh-repositories
# Install less for handling git diff properly
# Install sshpass for handling passwordds for SSH keys
RUN yum install -y sudo git bzip2 which bash curl openssh less epel-release && \
    yum install -y sshpass
    yum -y clean all && rm -rf /var/cache/yum && \
