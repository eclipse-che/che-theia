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
    ./build.sh
```

Then in `dockerfiles/theia` run:

```bash
./build.sh --build-args:THEIA_VERSION=master --branch:master --git-ref:refs\\/heads\\/master
```

That script will clone Theia from master branch and all Che related extensions from theirs master branches.
