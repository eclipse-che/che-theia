# recommendations-plugin
recommendations-plugin providing recommendations for plug-ins to use.

When opening a workspace from a devfile, the plug-in will scan files and detect file extensions.
If there is no plug-in for the given file extensions, it will add default featured plug-ins from the plug-in registry and prompt the user to restart the workspace.

This feature can be turned off by setting `extensions.ignoreRecommendations` to true in devfile attributes.

This plug-in can suggest plug-ins that can be useful for a given set of languages when opening files. This featured is disabled by default for now and can be enabled using `extensions.openFileRecommendations`
