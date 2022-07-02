# Copyright (c) 2019-21 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

# https://access.redhat.com/containers/?tab=tags#/registry.access.redhat.com/ubi8-minimal
FROM registry.access.redhat.com/ubi8-minimal:8.6-854 as runtime

RUN microdnf install -y python38 jq && pip3 install yq
COPY /src/ /tests/src
COPY /tests /tests/tests/
RUN /tests/tests/test_entrypoint.sh
