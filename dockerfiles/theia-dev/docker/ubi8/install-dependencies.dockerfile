USER root
RUN yum install -y curl make cmake gcc gcc-c++ python2 git openssh less bash tar gzip \
    && yum -y clean all && rm -rf /var/cache/yum
