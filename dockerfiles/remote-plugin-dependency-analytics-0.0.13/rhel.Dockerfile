# Copyright (c) 2019 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

FROM registry.access.redhat.com/ubi8/ubi

RUN dnf install -y \
      python3 nodejs java-1.8.0-openjdk maven \
      procps-ng nss \
    && dnf clean all \
    && if [[ ! -e "/usr/bin/python" ]] ; then ln -sf /usr/bin/python3 /usr/bin/python; fi

ENV JAVA_HOME /usr/lib/jvm/java-1.8.0-openjdk-1.8.0.232.b09-0.el8_0.x86_64/
ENV MAVEN_HOME /usr/share/maven/bin/
ENV PATH $MAVEN_HOME/bin:$PATH

ENV HOME /home/theia

RUN mkdir ${HOME} /projects \
    # Change permissions to let any arbitrary user
    && for f in "${HOME}" "/etc/passwd" "/projects"; do \
        echo "Changing permissions on ${f}" && chgrp -R 0 ${f} && \
        chmod -R g+rwX ${f}; \
    done

WORKDIR /projects

ADD etc/entrypoint.sh /entrypoint.sh

ENTRYPOINT [ "/entrypoint.sh" ]
CMD ${PLUGIN_REMOTE_ENDPOINT_EXECUTABLE}
