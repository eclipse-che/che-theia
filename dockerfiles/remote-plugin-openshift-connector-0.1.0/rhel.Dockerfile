# Copyright (c) 2019 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

FROM registry.access.redhat.com/ubi8

ENV GLIBC_VERSION=2.30-r0 \
    ODO_VERSION=v1.0.0-beta5 \
    OC_VERSION=v3.11.0 \
    OC_TAG=0cbc58b \
    KUBECTL_VERSION=v1.16.1

ENV HOME=/home/theia

RUN mkdir /projects ${HOME} && \
    # Change permissions to let any arbitrary user
    for f in "${HOME}" "/etc/passwd" "/projects"; do \
      echo "Changing permissions on ${f}" && chgrp -R 0 ${f} && \
      chmod -R g+rwX ${f}; \
    done

# the plugin executes the commands relying on Bash
RUN dnf install -y bash wget && \
    # install oc
    wget -O- https://github.com/openshift/origin/releases/download/${OC_VERSION}/openshift-origin-client-tools-${OC_VERSION}-${OC_TAG}-linux-64bit.tar.gz | tar xvz -C /usr/local/bin --strip 1 && \
    # install odo
    wget -O /usr/local/bin/odo https://github.com/openshift/odo/releases/download/${ODO_VERSION}/odo-linux-amd64 && \
    chmod +x /usr/local/bin/odo && \
    # install kubectl
    wget -O /usr/local/bin/kubectl https://storage.googleapis.com/kubernetes-release/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl && \
    chmod +x /usr/local/bin/kubectl

# ODO doesn't work without fixing user id
ADD etc/entrypoint.sh entrypoint.sh

ENTRYPOINT [ "/entrypoint.sh" ]
CMD ${PLUGIN_REMOTE_ENDPOINT_EXECUTABLE}
