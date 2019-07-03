Contribute to Che-Theia
================

There are 3 contribution points:
- Theia
- Che-Theia extensions
- Che-Theia plugins

For each of these kinds of contribution, rebuilding the container image is not needed to code, build and test your contribution.
We can create a Che workspace that would setup all the containers to build and run Che-Theia. The containers will rely on the same ones used in the CI for the Che-Theia container build. Building che-theia in the che-workspace would be very close to the one build by Docker.

You will find here few devfile that will help you in setting up theses environments

## Devfiles
Each devfile could be run on any Che instances. Beware that each of them may need a certain amount of memory.
Devfile could be launched through a factory or [chectl](https://github.com/che-incubator/chectl) cli.

```
$ chectl workspace:start -f devfiles/che-theia-all.devfile.yaml
```

## Devfile for contributing to Theia or Che-Theia extensions or Che-plugins
> Note that this devfile is going to evolve very soon and be splitted into multiple devfiles.

The devfile: [<this.repo>/devfiles/che-theia-all.devfile.yaml](../devfiles/che-theia-all.devfile.yaml)

The goal is to show how to setup a che7 environment to work on che-theia.
For the workflow we would have a workspace with such containers:

- Theia IDE (Editor) container (a.k.a theia-idexxx). It would have Theia editor with a set of plugins. It will also run the Theia instance for testing our development (theia-dev endpoint).
- Che-Theia Dev container (a.k.a che-dev). We will build the che-theia (theia + che-theia extensions) and plugins.

All containers have `/projects` folder mounted, which is shared among them.


Developer steps:

1. Start the workspace with the devfile, it is cloning Theia and the che-theia plugins.
2. Setup Theia sources to include Che-theia extension thanks to `che:theia init` command (Che-theia dev container)
3. ….. [ Code on theia or che-theia extension ]
4. Build che-theia (theia + che-theia extensions) (Che-theia dev container)
5. …...[ Code on the a plugin project ]
6. Build the plugin project (Che-theia dev container)
7. Run che-theia and will be configured to include the plugin. (Che-theia dev container or theia-ide container)

The following devfile provides examples of commands to build and run che-theia with factory and containers plugins.

### Che-theia init

You can use the che command `init ... DEV che-theia` (command pallette > Run task > … or containers view)
Basically, this command will perform:
```
[che-dev]
$ che:theia init --dev
```

This command will checkout all extensions in `/projects/theia/che` folder and create symbolic link into `/projects/theia/packages` folder.

By default, extensions list is retrieved from https://github.com/eclipse/che-theia/blob/master/che-theia-init-sources.yml

### Compile Che-Theia
You can use the che command `build ... DEV che-theia` (command pallette > Run task > … or containers view)
Basically, this command will perform:
```
[che-dev]
$ yarn
$ che:theia production
```

- `yarn` will compile theia + additional Che-theia extensions that have been setted up by `che:theia init`
- `che:theia production` will generate a production like package.

### Compile your plugin
You can use the che command `build ... containers-plugin` or `build ... factory-plugin` (command pallette > Run task > … or containers view)
Basically, this command will perform in the right plugin folder:

```
[che-dev]
$ yarn
```

`yarn` will compile the plugin and produce a .theia file which is the plugin itself.

### Run che-theia + plugin
You can use the che command `run ... che-theia + factory-plugin` or `run ... che-theia + containers-plugin` (command pallette > Run task > … or containers view)
Basically, this command will start the DEV che-theia with the plugin:

```
[theia-ide]
$ export HOSTED_PLUGIN=/projects/che-theia/plugins/factory-plugin/
$ node /projects/theia/production/src-gen/backend/main.js /tmp/theiadev_projects --hostname=0.0.0.0 --port=3130
```

You can then access to your modified Che-theia from the Container view `theia-dev` endpoint
![Che-Theia-dev-endpoint](https://raw.githubusercontent.com/eclipse/che-theia/master/doc/images/theia-dev-endpoint.png)

### Run che-theia + plugin in dev mode
You can use the che command `run ... DEV yarn start ... che-theia + factory-plugin` or
`run ... DEV yarn start... che-theia + containers-plugin`
(command pallette > Run task > … or containers view).
To start che-theia in `dev-mode` with yarn (not using the production che-theia generated). It would keep things like the ability to source map.

Running dev theia would be located in the che-dev container and `theia-dev-flow` endpoint:
![Che-Theia-dev-endpoint](https://raw.githubusercontent.com/eclipse/che-theia/master/doc/images/theia-dev-flow-endpoint.png)



### Just want to build the plugin and run with the existing Theia image
If you do not have any changes on Theia or Che-theia extension, you could just build the plugins with `build ... containers-plugin` or `build ... factory-plugin`
and run these plugins with the existing che-theia app:
`run ... HOSTED che-theia + container-plugin` or `run ... HOSTED che-theia + factory-plugin`

