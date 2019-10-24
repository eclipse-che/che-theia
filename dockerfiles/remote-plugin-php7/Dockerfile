# Copyright (c) 2019 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

FROM node:10.16-alpine

RUN apk --update --no-cache add \
        ca-certificates \
        php7 php7-fpm php7-opcache \
        php7-gd php7-mysqli php7-zlib php7-curl \
    && apk --update --no-cache add \
        php7-xdebug --repository http://dl-3.alpinelinux.org/alpine/edge/testing/ \
    && echo "zend_extension=$(find /usr/lib/php7/modules/ -name xdebug.so)" > /etc/php7/php.ini \
    && echo "xdebug.coverage_enable=0" >> /etc/php7/php.ini \
    && echo "xdebug.remote_enable=1" >> /etc/php7/php.ini \
    && echo "xdebug.remote_connect_back=1" >> /etc/php7/php.ini \
    && echo "xdebug.remote_log=/tmp/xdebug.log" >> /etc/php7/php.ini \
    && echo "xdebug.remote_autostart=true" >> /etc/php7/php.ini

ENV HOME=/home/theia

RUN mkdir /projects ${HOME} && \
    # Change permissions to let any arbitrary user
    for f in "${HOME}" "/etc/passwd" "/projects"; do \
      echo "Changing permissions on ${f}" && chgrp -R 0 ${f} && \
      chmod -R g+rwX ${f}; \
    done

WORKDIR /projects

ADD etc/entrypoint.sh /entrypoint.sh

ENTRYPOINT [ "/entrypoint.sh" ]
CMD ${PLUGIN_REMOTE_ENDPOINT_EXECUTABLE}
