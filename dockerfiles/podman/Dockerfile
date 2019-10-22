# Copyright (c) 2019 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation
FROM quay.io/podman/stable:v1.5.0

RUN dnf -y install mc

RUN adduser user

COPY ./src/entrypoint.sh /
COPY ./src/docker.sh /usr/local/bin/docker

# Set permissions on /etc/passwd and /home to allow arbitrary users to write
RUN chgrp -R 0 /home && chmod -R g=u /etc/passwd /home && chmod +x /entrypoint.sh /usr/local/bin/docker

USER user

ENV HOME=/home/user

WORKDIR /projects

ENTRYPOINT [ "/entrypoint.sh" ]
CMD ["tail", "-f", "/dev/null"]
