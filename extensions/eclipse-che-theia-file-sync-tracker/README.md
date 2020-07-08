# theia-file-sync-tracker extension

This extension tracks events of file synchronization progress during workspace startup.

### How does the extension work?

If workspace configured to use asynchronous storage, extension will open websocket connection to special service and show progress in status bar. In case some error, error message will be shown in status bar, the popup with error details will be disappeared after mouse click. After successfully file synchronization, status bar also will be updated with corresponding message, in this case message will disappear in 5 seconds.



