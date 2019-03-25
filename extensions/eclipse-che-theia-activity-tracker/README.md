# che-theia-activity-tracker extension

This extension tracks user activity and sends notification about that to Che workspace master to prevent stop of workspace due to inactivity timeout.

### What types of activity are tracked?

This extension tracks a key press, mouse clicks and mouse move.

### How does the extension use the tracked data?

The extension doesn't save or collect any data at all, it even doesn't distinguish between activity types. Only the fact of any activity matters.

## Technical info

### How heavy it is?

Activity events handlers are triggered quite often, but they are very lightweight, so the extension does not affect IDE performance much.

### How often are requests sent?

The requests strategy is well optimized on both frontend and backend side.

Frontend side in case of regular activity postpones sending request to backend for some period of time (1 minute by default).
So, when a user just works in the IDE only one request will be sent during the period.
But if any activity happens after idling then request will be sent immediately.
However, this approach has one small drawback. It might make inactivity timeout up to the period longer (the worst case when user makes an activity event right after request to backend, so that activity is tracked and will be sent only after current period).

Backend works similar to frontend, but instead of user activity events it gets requests from frontend. This is useful when backend has a few frontends, so in that case only one request will be sent to workspace master. Also, unlike frontend, it has additional mechanism for resending requests if some network error occurs.

### How to test the extension

The easiest way is to set workspace inactive timeout for 2 minutes and spend 4 minutes in the IDE. If the workspace is still running, it means that the extension works.

To edit workspace inactive timeout set `CHE_LIMITS_WORKSPACE_IDLE_TIMEOUT` (value is in milliseconds) in `che.env` and restart Che.
