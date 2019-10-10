# patch electron module by removing native keymap module (no need to have some X11 libraries)
RUN line_to_delete=$(grep -n native-keymap theia/dev-packages/electron/package.json | cut -d ":" -f 1) && \
    sed -i -e "${line_to_delete},1d" theia/dev-packages/electron/package.json
