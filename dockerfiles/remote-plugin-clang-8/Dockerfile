# Copyright (c) 2019 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

FROM debian:10-slim

ENV HOME=/home/user

RUN apt-get update && \
    apt-get install wget gnupg -y && \
    echo 'deb http://apt.llvm.org/buster/ llvm-toolchain-buster-8 main' >> /etc/apt/sources.list && \
    wget -O - https://apt.llvm.org/llvm-snapshot.gpg.key | apt-key add - && \
    wget -O - https://deb.nodesource.com/setup_10.x | bash - && \
    apt-get update && \
    apt-get install nodejs clangd-8 clang-8 clang-format-8 gdb -y && \
    apt-get clean && apt-get -y autoremove && rm -rf /var/lib/apt/lists/* && \
    update-alternatives --install /usr/bin/clang clang /usr/bin/clang-8 100 && \
    update-alternatives --install /usr/bin/clang++ clang++ /usr/bin/clang++-8 100 && \
    update-alternatives --install /usr/bin/clangd clangd /usr/bin/clangd-8 100 && \
    update-alternatives --install /usr/bin/clang-format clang-format /usr/bin/clang-format-8 100

RUN mkdir /projects ${HOME} && \
    chmod -R g+rwX /projects && \
    chmod -R 777 ${HOME}

ENTRYPOINT ["bash", "/entrypoint.sh"]
