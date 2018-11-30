# Eclipse Che API for Eclipse Theia Plugin API

This repository contains Eclipse Che API available for Eclipse Theia Plugins.
To use this API add dependency `@eclipse-che/plugin` in your `package.json` or
use `yarn add @eclipse-che/plugin`.

> If you write the Theia frontend plugin you need to modify your `webpack.config.js` externals section, by
>adding `@eclipse-che/plugin` with `che.`+your_plugin_id (it can be copied from `@theia/plugin` value with replacing `theia.` to `che.`).
>
> Example:
>```javascript
>  externals: {
>    "@theia/plugin": "theia.theia_test_api",
>    "@eclipse-che/plugin": "che.theia_test_api"
>  }
>```
