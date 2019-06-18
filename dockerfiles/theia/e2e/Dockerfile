# Copyright (c) 2018 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0

# Use upstream image
FROM ${BUILD_ORGANIZATION}/${BUILD_PARENT_IMAGE}:${BUILD_TAG} as theia
FROM cypress/browsers:chrome67

USER root
ENV HOME=/root
ENV NOCDN=true

RUN printf "deb http://archive.debian.org/debian/ jessie main\ndeb-src http://archive.debian.org/debian/ jessie main\ndeb http://security.debian.org jessie/updates main\ndeb-src http://security.debian.org jessie/updates main" > /etc/apt/sources.list
RUN apt-get update && \
    apt-get install -y libx11-dev libxkbfile-dev sudo iproute2
CMD /root/docker-run.sh
RUN yarn global add typescript@2.9.2 node-gyp && node-gyp install

# Add cypress scripts and grab dependencies
COPY src /root/
RUN cd /root && yarn

# Add tests
ADD cypress /root/cypress/

COPY --from=theia /home/theia /home/theia
COPY --from=theia /entrypoint.sh /entrypoint.sh
RUN find /home/theia/ -name "binding.gyp" |  xargs -i sh -c 'cd $(dirname {}) && node-gyp rebuild'
