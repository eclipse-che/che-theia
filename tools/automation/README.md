# Automation

Che-theia makes use of theia built-in extensions, located [here](https://github.com/eclipse-theia/theia/blob/master/package.json). The corresponding che-theia list of extensions is located [here](https://github.com/eclipse/che-theia/blob/master/generator/src/templates/theiaPlugins.json).

This directory contains various scripts which automate various maintenance steps of the registry.

## Automatic Plugin Reports

Every day at 01:00 UTC, the `theiaPlugins.json` file is parsed and a report is generated. The report can be found at https://eclipse.github.io/che-theia/.

The report format (with two sample entries) is as follows:

| Extension Name | Che-Theia Version | Theia Version | Error |
| ------ | ------ | ------ | ------
| vscode-builtin-bat | 1.39.1-prel | **1.44.2** | |
| vscode-builtin-css | 1.44.2 | 1.44.2 | |


When the che-theia version of a built-in extension is out of date, the far-right column "Theia Version" entry is bolded. If an error occurred while checking the extension, it will be reported in the "Error" column.
