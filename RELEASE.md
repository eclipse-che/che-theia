# Eclipse Che Theia release process

Launch the [release script](make-release.sh) and wait until [CI Job](https://ci.centos.org/view/Devtools/job/devtools-che-theia-che-release) is completed:

```
./make-release.sh --repo git@github.com:eclipse/che-theia --version <VERSION TO RELEASE> --theia-version <THEIA_VERSION> --theia-commit-sha <THEIA_COMMIT_SHA> --trigger-release
```

For example, to release Che Theia 7.7.0 based on upstream Eclipse Theia 0.15.0-next.15995cd0:
```
./make-release.sh --repo git@github.com:eclipse/che-theia --version 7.7.0 --theia-version 0.15.0-next.15995cd0 --theia-commit-sha 15995cd0ed4713ad12c34e5b1a478ba1b2d95a6b --trigger-release
```

## How to get an upstream Theia version?

To get `THEIA_VERSION` go to [npm registry](https://www.npmjs.com/package/@theia/core) and pick the latest `next` Theia version on `Versions` tab, e.g. `0.15.0-next.15995cd0`.

To get `THEIA_COMMIT_SHA` go to [Eclipse Theia repo](https://github.com/eclipse-theia/theia/commits/master) and pick the commit with SHA that corresponds to the short SHA in the npm package version. Usually, it's the latest commit.

For example, for Eclipse Theia version `0.15.0-next.15995cd0` the corresponding commit SHA is [`15995cd0ed4713ad12c34e5b1a478ba1b2d95a6b`](https://github.com/eclipse-theia/theia/commit/15995cd0ed4713ad12c34e5b1a478ba1b2d95a6b).
