# theia-file-sync-tracker extension

This extension tracks events of file synchronization progress during workspace startup.

### How does the extension work?

If workspace configured to use asynchronous storage extension will open websocket connection to special service and show progress in status bar. In case some error, error message will show in status bar after clicking will appear popup with error details. After successfully file synchronization status bar also will update with corresponding message, in this case message will disappear in 5 seconds.

## Technical info

TBD


