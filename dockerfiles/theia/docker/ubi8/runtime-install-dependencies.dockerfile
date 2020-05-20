# need root user
USER root

# Install sudo
# Install git
# Install bzip2 to unpack files
# Install which tool in order to search git
# Install curl and bash
# Install ssh for cloning ssh-repositories
# Install less for handling git diff properly
RUN yum install -y sudo git bzip2 which bash curl openssh less && \
    wget http://sourceforge.net/projects/sshpass/files/latest/download -O sshpass.tar.gz && tar -xvf sshpass.tar.gz && \
    cd sshpass*/ && ./configure && make install && cd .. && rm -rf sshpass*/ && \
    yum -y clean all && rm -rf /var/cache/yum
