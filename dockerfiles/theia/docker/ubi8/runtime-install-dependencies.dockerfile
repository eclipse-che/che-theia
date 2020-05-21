# need root user
USER root

# Install sudo
# Install git
# Install bzip2 to unpack files
# Install which tool in order to search git
# Install curl and bash
# Install ssh for cloning ssh-repositories
# Install less for handling git diff properly
# Install sshpass for handling passwords for SSH keys
RUN yum install -y sudo git bzip2 which bash curl openssh less && \
    wget https://netcologne.dl.sourceforge.net/project/sshpass/sshpass/1.06/sshpass-1.06.tar.gz -O sshpass.tar.gz && \
    tar -xvf sshpass.tar.gz && cd sshpass-1.06 && ./configure && make install && cd .. && rm -rf sshpass-1.06 && \
    yum -y clean all && rm -rf /var/cache/yum
