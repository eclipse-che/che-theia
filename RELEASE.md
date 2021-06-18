## Eclipse Che-Theia release process
See [Release Che-Theia](./.github/workflows/release.yml) workflow.

## Bugfix release with the upstream Theia commit included
To make another bugfix release of Che-Theia with the upstream Theia patch included, there're several options available.

### To include all the commits made before the required patch
- switch to the required Che-Theia tag, e.g. [7.27.x](https://github.com/eclipse-che/che-theia/blob/7.27.x)
- update the `build.include` file to match upstream Eclipse Theia revision:
  - `THEIA_COMMIT_SHA="<commit-sha>"`
- continue the release process as usual

### To include only the required upstream commit
- clone the Theia fork https://github.com/redhat-developer/eclipse-theia
- sync the `master` branch of the forked repository with the origin one and push the changes
- take the Theia commit sha which was used for a Che-Theia release, e.g. for 7.27.x it's [`1110f990`](https://github.com/eclipse-che/che-theia/blob/7.27.x/build.include#L17)
- create a new branch
- cherry-pick the required commit sha to the created branch and push the changes
- update the `build.include` file:
  - `THEIA_GITHUB_REPO="redhat-developer/eclipse-theia"`
  - `THEIA_BRANCH="<created-branch-name>"`
  - `THEIA_COMMIT_SHA="<commit-sha>"`
- push the changes
- continue the release process as usual

### Include a diff file
It's also possible to use a diff file to patch the Theia while releasing Che-Theia:
- prepare a `*.patch` file
- put it into the [`patches`](https://github.com/eclipse-che/che-theia/tree/main/dockerfiles/theia/src/patches) folder and a sub-folder which name corresponds to the [`THEIA_VERSION`](https://github.com/eclipse-che/che-theia/blob/7.27.x/build.include#L15) value, e.g. `master`
- continue the release process as usual
