# patch electron module by removing native keymap module (no need to have some X11 libraries)
RUN line_to_delete=$(grep -n native-keymap ${HOME}/theia-source-code/dev-packages/electron/package.json | cut -d ":" -f 1) && \
    sed -i -e "${line_to_delete},1d" ${HOME}/theia-source-code/dev-packages/electron/package.json
