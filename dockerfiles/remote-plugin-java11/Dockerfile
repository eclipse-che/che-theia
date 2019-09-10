# Copyright (c) 2019 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

FROM ${BUILD_ORGANIZATION}/${BUILD_PREFIX}-theia-endpoint-runtime:${BUILD_TAG}
RUN apk --no-cache add openjdk11 --repository=http://dl-cdn.alpinelinux.org/alpine/edge/community \
    && apk add procps nss \
    && chmod 777 /home/theia
ENV JAVA_HOME /usr/lib/jvm/default-jvm/
ADD etc/before-start.sh /before-start.sh
WORKDIR /projects
