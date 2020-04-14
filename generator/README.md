# @eclipse-che/theia-generator
===================================


# Installation guide

Theia Generator can be installed locally or globally

Here is how to install it globally:

using yarn:
```
$ yarn global add @eclipse-che/theia-generator
```

using npm:
```
$ npm install -g @eclipse-che/theia-generator
```

Then, a new command line tool is available : `che-theia`

# Using the tool

Once the tool is installed, the following commands are available:
- `che-theia init`
- `che-theia production`

(help is also available with command `che-theia --help`)

## che-theia init

This command needs to be launched inside a cloned directory of Eclipse Theia cloned directory

```
$ git clone https://github.com/eclipse-theia/theia
$ cd theia
$ che-theia init
```

once the init command has been launched:
- inside `theia/che` folder, all extensions and plugins have been cloned and checkout to their correct branches (if specified)
- all extensions have their package.json updated to the versions used by the current theia. (cloned)
- in `packages` folder, there are symlinks for each extension coming from `theia/che` folders. All packages are prefixed by `@che-`
- in `plugins` folder, there are symlinks for each plugin coming from `theia/che` folders.
- in `examples` folder, a new folder named àssembly` has been generated and include the `che-theia` assembly of Theia

In order to build the product, just run `yarn` at the root folder (where theia has been cloned)

### Custom extension and plugin set

Also you can provide custom `yaml` with your extension set, by using `-c` or `--config` parameter of `che-theia init` :

`che-heia init -c ./path/to/custom/che-theia-init-sources.yaml`

The sample of `che-theia-init-sources.yaml` can be found [there](https://github.com/eclipse/che-theia/blob/master/che-theia-init-sources.yml)

### Dev mode

Dev mode is the way to use all new extensions from `master` branch:

`che-theia init -d`

And `che-theia` will use `master` branch for all extensions and plugins, regardless of provided configuration

### Development life-cycle
Che Theia should be built from root directory only (Root directory of Che Theia is the directory into which Theia was clonned and `che-theia init` was executed there). In case of building from subdirectories it will mess up dependencies, don't do it.

To build whole Che Theia just execute `yarn` command in the root directory.
If only one module should be built, use `npx run build <module-name>`. For example `npx run build @theia/plugin-ext`.

Also one may set compilation on changes for some modules. To do so, run `npx run watch <module-name>` from the root directory. Then execute `yarn watch` from `examples/assembly` folder and run Che Theia with `yarn run start` command from the same directory. Make sure, you start watcher for all modules under development.

Note, this is not the case for embedded plugins.
To develop them one should place copy of their sources somewhere else (outside of the Che Theia folder) and then include new binaries into the assembly.

### Compiling the plugins
Plugins have to be compiled separately with the script `plugins/foreach_yarn`. This script simply run the `yarn` command on each subfolders of `plugins` and copy the `.theia` package in `production/plugins` folder to be reused by the che-theia product.

## che-theia production
A production's ready assembly of che-theia can be obtained by running from the root folder of theia: `che-theia production`

It will generate in `${where theia has been cloned}/production` folder a ready-to-use assembly of theia, without lot of files (like source maps, source code, etc)

It can be started with the command `node ${where theia has been cloned}/production/src-gen/backend/main.js`

## che-theia clean

If you want to clean up your Theia repository use
`che-theia clean` command, and it will undo all modification on your repository

# Developer's guide
[See Contributing](CONTRIBUTING.md)

# License

[EPL-2.0](LICENSE)
