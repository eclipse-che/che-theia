# Copyright (c) 2021 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

#{INCLUDE:docker/${BUILD_IMAGE_TARGET}/from.dockerfile}
#{INCLUDE:docker/${BUILD_IMAGE_TARGET}/setup.dockerfile}

COPY src/entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
