# Ext Plug-in
This plug-in is exposing some Eclipse Che API to be consumed by other VS Code extensions using the VS Code extension mechanism.

## Example

```typescript
const eclipseCheExtPlugin = vscode.extensions.getExtension('@eclipse-che.ext-plugin');
if (eclipseCheExtPlugin) {
  // grab user
  const user = await eclipseCheExtPlugin.exports.user.getCurrentUser();
  vscode.window.showInformationMessage(`Eclipse Che user information: id ${user.id} with name ${user.name}`);
}
```

Exported code is coming from https://github.com/eclipse/che-theia/blob/master/extensions/eclipse-che-theia-plugin/src/che-proposed.d.ts
