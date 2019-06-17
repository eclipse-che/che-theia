[![Build Status](https://ci.codenvycorp.com/buildStatus/icon?job=che-theia-master-ci)](https://ci.codenvycorp.com/job/che-theia-master-ci)
# Che-theia
## What is Che-theia ?
Che-theia is the default `Che editor` provided in [Eclipse Che 7](https://eclipse.org/che/).

Che-theia is IDE Web application based on the [Theia IDE](https://github.com/theia-ide/theia) project.

It contains
additional specific extensions and plugins
to provide the best IDE experience of Theia within Che.
 - A VSCode-like IDE experience. Che-Theia is based on the monaco
   editor and includes features like the command pallete.
 - VSCode extension compatibility. Che-Theia supports VSCode
   extension. These extensions could come with a side-car
   containers with all the dependency that the extension would need.
   No need to install the JDK or Maven when you install our VSCode Java plugin.
 - Nice views to interact to your user containers or production containers.
   (Terminal access, execute Che-commands in specific containers, etc...)

## Che-theia capabilities
In Che-theia, you’ll find the following capabilities:


| Plug-in               | Description |
|-----------------------|-------------|
| Che Extended Tasks    | Handles the Che commands and provides the ability to start those into a specific container of the workspace. |
| Che Extended Terminal | Allows to provide terminal for any of the containers of the workspace. |
| Che Factory           | Handles the Eclipse Che Factories [TODO: LINK] |
| Che Container         | Provides a container view that shows all the containers that are running in the workspace and allows to interact with them. |
| Che Dashboard         | Allows to integrate the IDE with Che Dashboard and facilitate the navigation. |
| Che Welcome Page      | Display a welcome page with handy links when opening the IDE. |
| Che Ports             | Allows to detect when services are running inside of the workspace and expose them. |
| Che APIs              | Extends the IDE APIs, to allow interacting with the Che specific components (workspaces, preferences, etc.). |


## Project structure

- [che-plugins](./che-plugins) contains Eclipse Che plugins definition
- [dockerfiles](./dockerfiles) contains Dockerfiles
- [extensions](./extensions) contains Theia Extensions
- [plugins](./plugins) contains Theia Plugins

## How to build

Run `yarn` to build Theia extensions and plugins.

> Note: this build Theia extensions and plugins __ONLY__

If you want to build all images also run `build.sh` script.

CI for PR job in this repository will use `build.sh --pr`.
> Note: `--pr` will build only limited set of docker images, see [PR_IMAGES variable](./docker_image_build.include)

If you want to publish docker images use `build.sh --push`

## How to build own che-theia image

First you need to build `che-theia-dev` image:

Run in `dockerfiles/theia-dev` dir:

```bash
    ./build.sh --build-arg:${GITHUB_TOKEN_ARG} --tag:next
```

Then in `dockerfiles/theia` run:

```bash
./build.sh --build-args:${GITHUB_TOKEN_ARG},THEIA_VERSION=master --tag:next --branch:master --git-ref:refs\\/heads\\/master
```

Where `${GITHUB_TOKEN_ARG}` is your GitHub API token, it's used for fetching some vscode library that placed on GitHub releases, without that token build may fail.

That script will clone Theia from master branch and all Che related extensions from theirs master branches.
