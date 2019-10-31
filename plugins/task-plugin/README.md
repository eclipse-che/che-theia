# Theia - Che Task Plug-in

The plugin allows to work with the Che Commands through the Theia Tasks concept.

Contributes:
- Che task runner that runs the Che commands as the Theia tasks;
- Che task resolver that fills the missed mandatory parameters in a task;
- Che task provider that provides the Che workspace's commands as provided Theia tasks;
- `Preview URLs` view;
- `che.task.preview.notifications` preference to set the preferred way of previewing a service URL:
  - `on` value enables a notification to ask a user how a URL should be opened
  - `alwaysPreview` value tells Theia to open a preview URL automatically inside Theia as soon as a task is running
  - `alwaysGoTo` value tells Theia to open a preview URL automatically in a separate browser's tab as soon as a task is running
  - `off` value disables opening a preview URL (automatically and with a notification)

The format of a Che task is the following:
```json
{
    "type": "che",
    "label": "",
    "command": "",
    "target": {
        "workspaceId": "",
        "component": "",
        "workingDir": ""
    },
    "previewUrl": ""
}
```
The `target` and `previewUrl` fields are optional.

The variables substitution is supported for the `command` and `previewUrl` fields.
