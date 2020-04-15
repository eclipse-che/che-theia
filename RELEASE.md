# Eclipse Che Theia release process

Launch the [release script](make-release.sh) and wait until [CI Job](https://ci.centos.org/view/Devtools/job/devtools-che-theia-che-release) is completed:

```
./make-release.sh --repo git@github.com:eclipse/che-theia --version <VERSION_TO_RELEASE> --theia-version <THEIA_VERSION> --trigger-release
```

Example: to release Che Theia 7.7.0 based on upstream Eclipse Theia 0.15.0-next.15995cd0:
```
./make-release.sh --repo git@github.com:eclipse/che-theia --version 7.7.0 --theia-version 0.15.0-next.15995cd0 --trigger-release
```

### How to get `THEIA_VERSION`?

Go to [npm registry](https://www.npmjs.com/package/@theia/core) and pick the latest `next` Theia version, e.g. `0.15.0-next.15995cd0`.
