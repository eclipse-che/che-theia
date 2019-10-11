# Copyright (c) 2019 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

FROM registry.access.redhat.com/ubi8/python-36

ENV HOME=/home/theia

USER root

RUN yum install -y nodejs && \
    pip install pylint python-language-server[all] ptvsd 'jedi<0.15,>=0.14.1'


RUN mkdir ${HOME} /projects \
    # Change permissions to let any arbitrary user
    && for f in "${HOME}" "/projects"; do \
        echo "Changing permissions on ${f}" && chgrp -R 0 ${f} && \
        chmod -R g+rwX ${f}; \
    done

RUN chmod -R 777 ${HOME}
