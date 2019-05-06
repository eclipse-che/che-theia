# che-theia

## Project structure

- [che-plugins](./che-plugins) contains Eclipse Che plugins definition
- [dockerfiles](./dockerfiles) contains Dockerfiles
- [extensions](./extensions) contains Theia Extensions
- [plugins](./plugins) contains Theia Plugins

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
