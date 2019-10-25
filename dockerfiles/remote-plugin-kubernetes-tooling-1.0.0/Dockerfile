# Copyright (c) 2019 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

FROM quay.io/buildah/stable:v1.9.0

ENV KUBECTL_VERSION v1.14.1
ENV HELM_VERSION v2.13.1
ENV HOME=/home/theia

RUN mkdir /projects ${HOME} && \
    # Change permissions to let any arbitrary user
    for f in "${HOME}" "/etc/passwd" "/projects"; do \
      echo "Changing permissions on ${f}" && chgrp -R 0 ${f} && \
      chmod -R g+rwX ${f}; \
    done

ADD etc/docker.sh /usr/local/bin/docker

RUN curl https://storage.googleapis.com/kubernetes-release/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl -o /usr/local/bin/kubectl && \
    chmod +x /usr/local/bin/kubectl && \
    curl -o- -L https://storage.googleapis.com/kubernetes-helm/helm-${HELM_VERSION}-linux-amd64.tar.gz | tar xvz -C /usr/local/bin --strip 1 && \
    # set up local Helm configuration skipping Tiller installation
    helm init --client-only && \
    # 'which' utility is used by VS Code Kubernetes extension to find the binaries, e.g. 'kubectl'
    dnf install -y which nodejs

ADD etc/entrypoint.sh /entrypoint.sh

ENTRYPOINT [ "/entrypoint.sh" ]
CMD ${PLUGIN_REMOTE_ENDPOINT_EXECUTABLE}