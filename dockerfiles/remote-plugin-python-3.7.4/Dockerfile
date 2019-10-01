# Copyright (c) 2019 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation
FROM ${BUILD_ORGANIZATION}/${BUILD_PREFIX}-theia-endpoint-runtime:${BUILD_TAG} as endpoint

FROM python:3.7.4-slim

ENV HOME=/home/theia

RUN apt-get update && \
    apt-get install wget -y && \
	wget -O - https://deb.nodesource.com/setup_10.x | bash - && \
    apt-get update && \
	apt-get install nodejs -y && \
	apt-get clean && apt-get -y autoremove && rm -rf /var/lib/apt/lists/* && \
    pip install pylint python-language-server[all] ptvsd 'jedi<0.15,>=0.14.1'

COPY --from=endpoint /home/theia /home/theia
COPY --from=endpoint /projects /projects
COPY --from=endpoint /etc/passwd  /etc/passwd
COPY --from=endpoint /etc/group   /etc/group
COPY --from=endpoint /entrypoint.sh /entrypoint.sh

RUN chmod -R 777 ${HOME}

ENTRYPOINT ["bash", "/entrypoint.sh"]
