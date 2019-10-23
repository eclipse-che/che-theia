USER root
RUN yum install -y curl make cmake gcc gcc-c++ python2 git openssh less bash tar gzip \
    && yum -y clean all && rm -rf /var/cache/yum && \
    ln -s /usr/bin/python2.7 /usr/bin/python; python --version && \
    echo "Installed Packages" && rpm -qa | sort -V && echo "End Of Installed Packages"
