# Copyright (c) 2019 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation
FROM ${BUILD_ORGANIZATION}/che-remote-plugin-kubernetes-tooling-1.0.0:${BUILD_TAG}

ENV KAMEL_VERSION 1.0.0-M1

RUN curl -L https://github.com/apache/camel-k/releases/download/${KAMEL_VERSION}/camel-k-client-${KAMEL_VERSION}-linux-64bit.tar.gz | tar -C /usr/local/bin -xz \
	&& chmod +x /usr/local/bin/kamel
