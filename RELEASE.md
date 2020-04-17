# Eclipse Che Theia release process

Launch the [release script](make-release.sh) and wait until [CI Job](https://ci.centos.org/view/Devtools/job/devtools-che-theia-che-release) is completed:

```
./make-release.sh --repo git@github.com:eclipse/che-theia --version <VERSION_TO_RELEASE> --trigger-release
```

**NOTE:** before doing a minor release (x.y.0), update [`THEIA_VERSION`](THEIA_VERSION) file with a required version of Eclipse Theia.

Go to [npm registry](https://www.npmjs.com/package/@theia/core) and pick the latest `next` Theia version, e.g. `0.15.0-next.15995cd0`
