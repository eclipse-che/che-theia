# patch electron module by removing native keymap module (no need to have some X11 libraries)
RUN line_to_delete=$(grep -n native-keymap ${HOME}/theia-source-code/dev-packages/electron/package.json | cut -d ":" -f 1) && \
    if [[ ${line_to_delete} ]]; then \
        sed -i -e "${line_to_delete},1d" ${HOME}/theia-source-code/dev-packages/electron/package.json; \
    else \
        echo "[WARNING] native-keymap not found in ${HOME}/theia-source-code/dev-packages/electron/package.json"; \
    fi
