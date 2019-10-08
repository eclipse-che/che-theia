# Copyright (c) 2019 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

FROM python:3.7.3-slim

RUN apt-get update && \
    pip install pylint python-language-server[all] ptvsd 'jedi<0.15,>=0.14.1'

RUN chmod -R 777 ${HOME}
