# Copyright (c) 2019 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

FROM registry.redhat.io/openjdk/openjdk-11-rhel8


ENV HOME=/home/theia
USER root

RUN mkdir /home/theia /projects \
    # Change permissions to let any arbitrary user
    && for f in "${HOME}" "/etc/passwd" "/etc/group" "/projects"; do \
        echo "Changing permissions on ${f}" && chgrp -R 0 ${f} && \
        chmod -R g+rwX ${f}; \
    done
ADD etc/entrypoint.sh /entrypoint.sh

ADD etc/before-start.sh /before-start.sh

WORKDIR /projects

ENTRYPOINT ["/entrypoint.sh"]
