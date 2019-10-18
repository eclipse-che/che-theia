# Copyright (c) 2019 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

FROM registry.access.redhat.com/ubi8/php-72

USER root

RUN dnf install -y php-fpm php-opcache

RUN dnf install -y php-devel php-pear \
    php-gd php-mysqli php-zlib php-curl \
    ca-certificates \
    && pecl install xdebug \
    && echo "zend_extension=$(find /usr/lib64/php/modules -name xdebug.so)" > /etc/php.ini \
    && echo "xdebug.coverage_enable=0" >> /etc/php.ini \
    && echo "xdebug.remote_enable=1" >> /etc/php.ini \
    && echo "xdebug.remote_connect_back=1" >> /etc/php.ini \
    && echo "xdebug.remote_log=/tmp/xdebug.log" >> /etc/php.ini \
    && echo "xdebug.remote_autostart=true" >> /etc/php.ini

ENV HOME=/home/theia

RUN mkdir ${HOME} /projects \
    # Change permissions to let any arbitrary user
    && for f in "${HOME}" "/projects"; do \
        echo "Changing permissions on ${f}" && chgrp -R 0 ${f} && \
        chmod -R g+rwX ${f}; \
    done

WORKDIR /projects
