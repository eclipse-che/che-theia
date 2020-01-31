# Che Theia release process

#### Make the release changes

1. Create a branch for the release, e.g. `7.7.0`

> **NOTE:** Che Theia release can depend on [Eclipse Theia](https://github.com/eclipse-theia/theia) tag or commit. Below is an example of **step 2** for preparing Che Theia release 7.7.0 which depends on upstream Theia tag 0.14.0. If you need to depend on Theia commit then **step 2** is a bit different. Follow [`The release changes to depend on Theia commit`](#the-release-changes-to-depend-on-theia-commit) section instead.

<a name="step-2"></a>
[2.](#step-2) Run `./set_theia_version.sh` script and provide the required data.
```
Do you want to change branch in 'che-theia-init-sources.yml'? [Y/n] <Enter>
Enter branch name: 7.7.0
Enter Theia version : 0.14.0 <-- latest released Theia version on https://www.npmjs.com/package/@theia/core
Enter che-theia image tag [latest]: <Enter>
Enter Theia branch name [v0.14.0]: <Enter>
Enter Theia git refs [refs\/tags\/v0.14.0]: <Enter>
Enter che-theia image version [0.14.0]: 7.7.0
Do you want to update extension/plugin version with '7.7.0'? [Y/n] <Enter>
```

3. Verify the build is passed successfully - `yarn`.
4. Commit the changes to the branch, e.g. `7.7.0`. Push it to GitHub.

#### Trigger the CI

1. Delete the existing `release` branch on GitHub [manually](https://github.com/eclipse/che-theia/branches) if it exists.
2. Create a branch `release` with the release changes, e.g. `7.7.0`
```
git checkout 7.7.0
git push origin 7.7.0:release
```
4. Track the [CI Job](https://ci.centos.org/view/Devtools/job/devtools-che-theia-che-release)

#### Create and publish a tag

Once CI job is finished successfully, create a tag and push it to GitHub, e.g. for `7.7.0`:
```
git checkout 7.7.0
git tag v7.7.0
git push origin v7.7.0
```

---

## The release changes to depend on Theia commit

> **NOTE:** Below is the example of [**step 2**](#step-2) in case you need to depend on Theia commit instead of Theia tag.

Choose a commit in Theia upstream which you want to depend on, e.g. [`15995cd0ed4713ad12c34e5b1a478ba1b2d95a6b`](https://github.com/eclipse-theia/theia/commit/15995cd0ed4713ad12c34e5b1a478ba1b2d95a6b)

Find a corresponding package on [NPM registry](https://www.npmjs.com/package/@theia/core), e.g. `0.15.0-next.15995cd0`

Run `./set_theia_version.sh` script and provide the required data.
```
Do you want to change branch in 'che-theia-init-sources.yml'? [Y/n] <Enter>
Enter branch name: 7.7.0
Enter Theia version : 0.15.0-next.15995cd0
Enter che-theia image tag [latest]: <Enter>
Enter Theia branch name [v0.15.0-next.15995cd0]: master
Enter Theia git refs [refs\/tags\/v0.15.0-next.15995cd0]: refs\\\\\\\\\\/heads\\\\\\\\\\/master
Enter che-theia image version [0.15.0-next.15995cd0]: 7.7.0
Do you want to update extension/plugin version with '7.7.0'? [Y/n] <Enter>
```

Then, some manual edits are required in several files.

- `build.include`

Set `master` to the following rows:
```
THEIA_VERSION="master"
```

- `dockerfiles/theia/Dockerfile`

Set `THEIA_VERSION` to `master`:

```
ARG THEIA_VERSION=master
```

- `dockerfiles/theia-dev/e2e/Dockerfile`

Set the branch to `master`, in cloning command:
```
RUN git clone -b 'master' --single-branch --depth 1 https://github.com/eclipse-theia/theia theia
```

- `dockerfiles/theia/docker/alpine/builder-clone-theia.dockerfile`

Replace with the followings to checkout to the specified commit:
```
# Clone theia and keep source code in home
RUN git clone --branch ${GIT_BRANCH_NAME} --single-branch --depth 1 https://github.com/${THEIA_GITHUB_REPO} ${HOME}/theia-source-code \
    && cd ${HOME}/theia-source-code && git checkout 15995cd0ed4713ad12c34e5b1a478ba1b2d95a6b
```

- `dockerfiles/theia/docker/ubi8/builder-clone-theia.dockerfile`

Replace with the followings to checkout to the specified commit:
```
# Clone theia and keep source code in home
RUN git clone --branch ${GIT_BRANCH_NAME} --single-branch --depth 1 https://github.com/${THEIA_GITHUB_REPO} ${HOME}/theia-source-code \
    && cd ${HOME}/theia-source-code && git checkout 15995cd0ed4713ad12c34e5b1a478ba1b2d95a6b \
    && cd ${HOME} && tar zcf ${HOME}/theia-source-code.tgz theia-source-code
```
