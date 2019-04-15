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

ENV KUBECTL_VERSION v1.14.0
ENV HELM_VERSION v2.13.1

RUN apk add --update --no-cache ca-certificates && \
    wget -q https://storage.googleapis.com/kubernetes-release/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl -O /usr/local/bin/kubectl && \
    chmod +x /usr/local/bin/kubectl && \
    wget -O- https://storage.googleapis.com/kubernetes-helm/helm-${HELM_VERSION}-linux-amd64.tar.gz | tar xvz -C /usr/local/bin --strip 1 && \
    helm init --client-only
