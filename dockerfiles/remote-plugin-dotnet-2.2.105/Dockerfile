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

RUN apk add --no-cache \
    ca-certificates \
    \
    # .NET Core dependencies
    krb5-libs \
    libgcc \
    libintl \
    icu-libs \
    libssl1.0 \
    libstdc++ \
    tzdata \
    userspace-rcu \
    zlib \
    lttng-ust \
    bash \
    mono mono-dev mono-lang --repository=http://dl-4.alpinelinux.org/alpine/edge/testing \
    \
    # To run netcoredbg
    musl\>1.1.20 libc6-compat\>1.1.20 gcompat --repository http://dl-cdn.alpinelinux.org/alpine/v3.9/main

ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false \
    LC_ALL=en_US.UTF-8 \
    LANG=en_US.UTF-8

# Install .NET Core SDK
ENV DOTNET_SDK_VERSION 2.2.105

RUN wget -O dotnet.tar.gz https://dotnetcli.blob.core.windows.net/dotnet/Sdk/$DOTNET_SDK_VERSION/dotnet-sdk-$DOTNET_SDK_VERSION-linux-musl-x64.tar.gz \
    && dotnet_sha512='04045f20440fca38bc517cf6ae1c6bea48e773629ada8b86f3ce0394784b1372a180aa829fa2bcc5abc184a0e41babe7c5ff0ef376c2b89aad271a0cfb3d75e4' \
    && echo "$dotnet_sha512  dotnet.tar.gz" | sha512sum -c - \
    && mkdir -p /usr/share/dotnet \
    && tar -C /usr/share/dotnet -xzf dotnet.tar.gz \
    && ln -s /usr/share/dotnet/dotnet /usr/bin/dotnet \
    && rm dotnet.tar.gz \
    && mkdir ${HOME}/.dotnet && chmod -R 777 ${HOME}/.dotnet \
    && mkdir /usr/share/dotnet/sdk/NuGetFallbackFolder && chmod 777 /usr/share/dotnet/sdk/NuGetFallbackFolder

ENV MSBuildSDKsPath=/usr/share/dotnet/sdk/$DOTNET_SDK_VERSION/Sdks \
    PATH=$MSBuildSDKsPath:$PATH

RUN wget -O /usr/lib/mono/xbuild/15.0/Microsoft.Common.props https://raw.githubusercontent.com/Microsoft/msbuild/v15.9.21.664/src/Tasks/Microsoft.Common.props

# Enable correct mode for dotnet watch (only mode supported in a container)
ENV DOTNET_USE_POLLING_FILE_WATCHER=true \
    # Skip extraction of XML docs - generally not useful within an image/container - helps performance
    NUGET_XMLDOC_MODE=skip

# Trigger first run experience by running arbitrary cmd to populate local package cache
RUN dotnet --version
