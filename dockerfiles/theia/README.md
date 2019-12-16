# How to Build Theia Image

## Build image manually using build scripts

To build all the images you can easily run [build.sh](../../build.sh) script located in the repository root. It will build container with Theia editor, dev container with tools to develop on TypeScript and containers containing remote plugins. 

```bash
./build.sh
```

CI for checking any pull request in this repository runs this script with `--pr` directive
```bash
`build.sh --pr`.
```

**Note**: `--pr` will build only [limited set](../../build.include) of docker images.	

## How to build own Che Theia image with Docker

[Che-Theia](Dockerfile) image is based on [Theia-Dev](../theia-dev/Dockerfile) image, which contains a set of tools for TypeScript development.
Also theia-dev image includes `@theia/generator-plugin` which can be easily used in both Theia-Dev and Che-Theia containers.

Build script always use current Che-Theia sources. To test your changes you don't need to push your changes somewhere. Just go to `dockerfiles/theia` directory and run:

```bash	
./build.sh --build-args:GITHUB_TOKEN=${GITHUB_TOKEN},THEIA_VERSION=master --tag:next --branch:master --git-ref:refs\\/heads\\/master
```

Where [`${GITHUB_TOKEN}`](#github-token) is your GitHub API token, it's used for fetching some vscode libraries that placed on GitHub releases. Without that token build will fail.

This script will build new docker image `eclipse/che-theia:next`. The image will contain Che-Theia based on Theia from master branch.

## Build arguments

General command to build Che-Theia with all possible argiments:

```bash
./build.sh --build-args:GITHUB_TOKEN=${GITHUB_TOKEN},THEIA_VERSION=${THEIA_VERSION} --tag:${IMAGE_TAG} --branch:${THEIA_BRANCH} --git-ref:${THEIA_GIT_REFS} --skip-tests
```

### GitHub Token

**`${GITHUB_TOKEN}`**

This is your GitHub token. Some Theia dependencies placed on GitHub repository and fetched from the GitHub by using GitHub API. For the successful build you need to:
- generate [new GitHub API token](https://github.com/settings/tokens)
- set `GITHUB_TOKEN` environment variable
    ```bash
    export GITHUB_TOKEN=<your_github_token>
    ```
- pass the token to the script
    ```bash
    ./build.sh --build-args:GITHUB_TOKEN=${GITHUB_TOKEN}
    ```

Parameter `${GITHUB_TOKEN}` is optional. It's necessary only when exceeding the [limit of GitHub requests](https://developer.github.com/apps/building-github-apps/understanding-rate-limits-for-github-apps/).


## Theia Branch

**`${THEIA_BRANCH}`**

It specifies tag or branch for base Theia. Build script clones Theia sources, switches to that branch/tag, and only then clones Che-Theia.

Parameter `${THEIA_BRANCH}` is optional. If it's not specified, the default value `'master'` will be used.


CI generates several tags of [docker images](https://quay.io/repository/eclipse/che-theia?tab=tags). Below is the list of images:

- `eclipse/che-theia:next`
  - theia branch: [master](https://github.com/theia-ide/theia/)
  - che-theia branch: [master](https://github.com/eclipse/che-theia)
  - CI [build job](https://ci.centos.org/view/Devtools/job/devtools-che-theia-che-build-master/)
  - CI [nightly build job](https://ci.centos.org/view/Devtools/job/devtools-che-theia-che-nightly/)

- `eclipse/che:theia:latest` the latest stable Che-Theia 7.x release, updates on each release by CI [release job](https://ci.centos.org/view/Devtools/job/devtools-che-theia-che-release/)

## Theia version

**`${THEIA_VERSION}`**

This parameter is used for finding patches. All found patches from `'/patches/${THEIA_VERSION}'` directory will be applied to Theia sources.
You can set `THEIA_VERSION` environment variable and don't pass it to the script when building.

Parameter `${THEIA_VERSION}` is optional. If it's not specified, the default value `'master'` will be used.


## Image Tag

**`${IMAGE_TAG}`**

A newly created docker image will have this version. Passing `'--tag:1.0.0'` to the script will lead to creating `eclipse/che-theia-dev:1.0.0` docker image.

Parameter `${IMAGE_TAG}` is optioal. If it's not specified, the default value `'next'` will be used.

## Theia Git Prefs

**`${THEIA_GIT_REFS}`**

Is used to invalidate docker cache when the current che-theia branch has been changed after last build of the dockerfile. If you are building che-theia from your branch, you have to set refs to `'refs\\/heads\\/${THE_BRANCH_NAME}'`.

This parameter is optional. Default value is `'refs\\/heads\\/master'`.

## Skip Tests

**`--skip-tests`**

Add this parameter to the build command to have a quick build and to skip running tests in dedicated container.

By default tests are turned on. 

## CDN Support

This image can be built with CDN support, which means that it can be configured in a way that the client-side resources required to start
the IDE in the browser will be searched for on a CDN first, and then on the workspace IDE server if not found on the CDN.

In order to enable CDN support, the following **build arguments** are used:

- `CDN_PREFIX`

This is the base CDN URL (ending with a `/`) where the `theia` IDE artifacts will be made available,

- `MONACO_CDN_PREFIX`

This is the base CDN URL (ending with a `/`) where the Monaco-related artifacts used in Theia should be found.

Since Theia imports the Monaco dependencies from NPM packages, and bundles them as external files, there is a separate CDN prefix
for those Monaco-related files. This allows retrieving them from any CDN that is automatically synchronized with NPM,
such as http://unpkg.com/ or https://www.jsdelivr.com/.

NPM version number and file paths are added automatically by the Che-Theia CDN support.

For example, using JSDelivr, the following build argument should be added: `MONACO_CDN_PREFIX=https://cdn.jsdelivr.net/npm/`. 

Alternatively, if `CDN_PREFIX` and `MONACO_CDN_PREFIX` are provided as **environment variables**, the corresponding build arguments
will be added automatically by the `build.sh` script. This will make CDN support configuration easier in CI builds.

**Important note:** When CDN support is enabled, you should use the `build.sh` command to build the docker image (as show above), instead of the
native-docker way.

## Push files to Akamai NetStorage

When CDN support is enabled, the `build.sh` script allows pushing the artifacts to an Akamai NetStorage account.
The following **environment variables** can be set when calling the `build.sh` script, in order to push files to a NetStorage account:

- `AKAMAI_CHE_AUTH`

This is a mandatory multi-line environment variable that should contain the Akamai NetStorage configuration,
according to the following syntax:

```
[default]
key = <Secret key for the Akamai NetStorage account>
id = <NetStorage account ID>
group = <NetStorage storage group>
host = <NetStorage host>
cpcode = <NetStorage CPCode>
```

For more information, please refer to the Akamai NetStorage documentation or https://github.com/akamai/cli-netstorage

- `AKAMAI_CHE_DIR`

This optional environment variable allows overriding the base directory in which Theia IDE files will be pushed under
the configured NetStorage account. The default value is `che`.

The external URL where Theia IDE files will be available is built according to the following rules:

`<NetStorage storage group base URL>/${AKAMAI_CHE_DIR}/theia_artifacts/<theia IDE file path>`

For example if the NetStorage base URL is `https://assets.openshift.net`, and the `AKAMAI_CHE_DIR` is `che`,
then `CDN_PREFIX` build argument value would be set to:

`https://assets.openshift.net/che/theia_artifacts/`
