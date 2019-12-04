# Add patches
ADD src/patches ${HOME}/patches

# Apply patches
RUN if [ -d "${HOME}/patches/${THEIA_VERSION}" ]; then \
    echo "Applying patches for Theia version ${THEIA_VERSION}"; \
    for file in $(find "${HOME}/patches/${THEIA_VERSION}" -name '*.patch'); do \
      echo "Patching with ${file}"; \
      cd ${HOME}/theia-source-code && patch -p1 < ${file}; \
    done \
    fi
