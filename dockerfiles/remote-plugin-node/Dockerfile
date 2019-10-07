# Copyright (c) 2019 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

FROM node:10.16-alpine

ENV HOME=/home/user

RUN mkdir /projects /home/user && \
    chmod -R g+rwX /projects && \
    chmod -R g+rwX ${HOME}
