# Copyright (c) 2019 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

FROM php:7.1-apache

RUN apt-get -y update \
    && apt-get install -y libicu-dev\
    	tree \
        vim \
        wget \
        git \
        libzip-dev \
        zlib1g-dev \
        zip \
    && docker-php-ext-configure intl \
    && docker-php-ext-install intl \
    && docker-php-ext-configure zip --with-libzip \
    && docker-php-ext-install zip mysqli pdo pdo_mysql \
    && chmod -R 777 /etc/apache2  /var/www /var/lib/apache2 /var/log \
    && chown -R www-data:www-data /var/www \
    \
	#change Apache configuration
	\
	&& sed -i "s/80/8080/g" /etc/apache2/sites-available/000-default.conf /etc/apache2/ports.conf \
    && sed -i 's/\/var\/www\/html/\/projects/g'  /etc/apache2/sites-available/000-default.conf \
    && sed -i 's/\/var\/www/\/projects/g'  /etc/apache2/apache2.conf \
    && sed -i 's/None/All/g' /etc/apache2/sites-available/000-default.conf \
    && echo "ServerName localhost" | tee -a /etc/apache2/apache2.conf

#add composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /projects

CMD sleep infinity
