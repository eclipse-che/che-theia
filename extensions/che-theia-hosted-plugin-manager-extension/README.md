# Theia Hosted Plugin Manager extension

This extension is Che specific and works only inside Che workspace.

The main purpose of this extension is to take care about url changing and/or port forwarding caused by running Theia inside container.

### Technical info

#### What is the reason for this extension?

This extension is designed to provide correct route for end user (and main Theia frontend) when Theia runs inside Eclipse Che.

#### When this extension is used?

Each time when an extra Theia instance is needed.
For now, it is used for hosted plugin instance.

#### Why it doesn't work without this extension?

Theia server starts on some port.
If Theia runs natively a user can just use direct url, but in case when Theia is running inside Eclipse Che workspace direct url won't work. There should be a dedicated server in workspace config to expose needed port and this server has a preview url which is designed to access the resource from outside.

#### How does this extension work?

To expose port from within workspace Eclipse Che uses servers concept. Servers are described in workspace config. To operate with the right uri, the extension retrieves hosted instance server url form workspace config.

#### How to test the extension

First, expose hosted instance port via server in workspace config (it is already done in Theia stack).
The server for hosted plugin instance should have attribute "type" with "ide-dev" value.
By default hosted plugin instance is started on 3030 port, but it can be changed by setting `HOSTED_PLUGIN_PORT` environment variable inside workspace. Also, to allow Theia handle requests from other hosts specify `HOSTED_PLUGIN_HOSTNAME` environment variable. For example, to allow requests from any host set `HOSTED_PLUGIN_HOSTNAME=0.0.0.0` (already done in Theia stack).
The server configuration might be:

```json
"theia-dev": {
    "attributes": {
        "type": "ide-dev"
    },
    "port": "3030",
    "protocol": "http"
}
```

When setup is done, then just start hosted plugin instance (use `Hosted Plugin: Start Instance` command). If a new browser tab with hosted instance is opened then it works as expected.

#### What infrastructures does this extension support?

For now it supports docker and openshift.
