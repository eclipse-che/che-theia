Contribute to Che-Theia
================

Table of contents

 - [Introduction](#introduction)
 - [Devfiles](#devfiles)
 - [Contribute to Theia or Che-Theia extensions or built-in Che-Theia plugins](#contribute-to-theia-or-che-theia-extensions-or-built-in-che-theia-plugins)
   - [Just want to build the plugin and run with the existing Theia image](#just-want-to-build-the-plugin-and-run-with-the-existing-theia-image)
 - [How to develop Che Theia remote plugin mechanism](#how-to-develop-che-theia-remote-plugin-mechanism)

## Introduction

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

## Contribute to Theia or Che-Theia extensions or built-in Che-Theia plugins
> Note that this devfile is going to evolve very soon and be splitted into multiple devfiles.

The devfile: [<this.repo>/devfiles/che-theia-all.devfile.yaml](./devfiles/che-theia-all.devfile.yaml)

In this section, we show how to setup a Che 7 environment to work on che-theia, and how to use it.
For the whole workflows, we will need a workspace with such containers:

- Theia IDE (Editor) container (a.k.a theia-idexxx). It would have Theia editor with a set of plugins. It will also run the Theia instance for testing our development (theia-dev endpoint).
- Che-Theia Dev container (a.k.a che-dev). We will build the che-theia (theia + che-theia extensions) and plugins.

All containers have `/projects` folder mounted, which is shared among them.


Developer workflow:

1. Start the workspace with the devfile, it is cloning Theia and the che-theia plugins.
2. Setup Theia sources to include Che-theia extension thanks to `che:theia init` command (Che-theia dev container)
3. ….. [ Code on theia or che-theia extension ]
4. Build che-theia (theia + che-theia extensions) (Che-theia dev container)
5. …...[ Code on the a plugin project ]
6. Build the plugin project (Che-theia dev container)
7. Run che-theia and will be configured to include the plugin. (Che-theia dev container or theia-ide container)

The following devfile provides examples of commands to build and run che-theia with factory and containers plugins.


### Step 1: Start the workspace
In this section we are going to start a new workspace to work on che-theia. The new workspace will have few projects cloned: `theia` and `che-theia`. It will also setup the containers and commands in the `My workspace` view. We will use these commands in the next steps.

The devfile could be started using `chectl`:

```
chectl workspace:start -f https://raw.githubusercontent.com/eclipse/che-theia/master/devfiles/che-theia-all.devfile.yaml
```
At workspace start, Che will clone Theia and Che-theia.



### Step 2: Decorate Theia with Che-theia extensions: che-theia init

In this section we are going to adapt Theia build so it creates an assembly with che-theia specific extensions.

You can use the che command `init ... DEV che-theia` (command pallette > Run task > … or containers view)
Basically, this command will perform:
```
[che-dev]
$ che:theia init --dev
```

This command will checkout all extensions in `/projects/theia/che` folder and create symbolic link into `/projects/theia/packages` folder.

By default, extensions list is retrieved from https://github.com/eclipse/che-theia/blob/master/che-theia-init-sources.yml

### Step 3: Code che-theia extensions
At this point you can code on che-theia extensions inside `/projects/theia/che/che-theia/extensions` folder. Extensions changes would be taken into account in the next step.

### Step 4: Compile Che-Theia
You can use the che command `build ... DEV che-theia` (command pallette > Run task > … or containers view)
Basically, this command will perform:
```
[che-dev]
$ yarn
$ che:theia production
```

- `yarn` will compile theia + additional Che-theia extensions that have been setted up by `che:theia init`
- `che:theia production` will generate a production like package.

### Step 5: Code che-theia plugins
At this stage, you can code on Che-theia plugins. In this devfile, containers and factory plugin are covered.
Che-theia plugins are located in `/projects/che-theia/plugins/` folder.

### Step 6: Compile your plugin
You can use the che command `build ... containers-plugin` or `build ... workspace-plugin` (command pallette > Run task > … or containers view)
Basically, this command will perform in the right plugin folder:

```
[che-dev]
$ yarn
```

`yarn` will compile the plugin and produce a .theia file which is the plugin itself.

### Step 7: Run che-theia + plugin
In this section, we are going to run the che-theia assembly built previously and run that with one of the plugins built previously. We will be able to test our changes with a dedicated che-theia instance.

You can use the che command `run ... DEV che-theia + workspace-plugin` or `run ... DEV che-theia + containers-plugin` (command pallette > Run task > … or containers view)
Basically, this command will start the DEV che-theia with the plugin:

```
[theia-ide]
$ export HOSTED_PLUGIN=/projects/che-theia/plugins/workspace-plugin/
$ node /projects/theia/production/src-gen/backend/main.js /tmp/theiadev_projects --hostname=0.0.0.0 --port=3130
```

You can then access to your modified Che-theia from the Container view `theia-dev` endpoint
![Che-Theia-dev-endpoint](https://raw.githubusercontent.com/eclipse/che-theia/assets/theia-dev-endpoint.png)

### Step 7bis: Run che-theia + plugin in dev mode
In this section we show how to run the che-theia assembly but in `dev mode`: keeping all the information for debugging.

You can use the che command `run ... DEV yarn start ... che-theia + workspace-plugin` or
`run ... DEV yarn start... che-theia + containers-plugin`
(command pallette > Run task > … or containers view).
To start che-theia in `dev-mode` with yarn (not using the production che-theia generated). It would keep things like the ability to source map.

Running dev theia would be located in the che-dev container and `theia-dev-flow` endpoint:
![Che-Theia-dev-endpoint](https://raw.githubusercontent.com/eclipse/che-theia/assets/theia-dev-flow-endpoint.png)

### Just want to build the plugin and run with the existing Theia image
If you do not have any changes on Theia or Che-theia extension, you could just build the plugins with `build ... containers-plugin` or `build ... workspace-plugin`
and run these plugins with the existing che-theia app:
`run ... HOSTED che-theia + container-plugin` or `run ... HOSTED che-theia + workspace-plugin`


## How to develop Che Theia remote plugin mechanism

_Please note, this section provides a flow how to develop remote plugin mechanism in Che Theia, but not a remote plugin._

First, create a workspace from prepared [devfile](https://github.com/eclipse/che-theia/blob/master/extensions/eclipse-che-theia-plugin-remote/devfile.yaml), which could be found in the `eclipse-che-theia-plugin-remote` extension folder.
When workspace is ready:
 - Init Che Theia. This could be done with `che:theia init` command in `/projects/theia` folder or run the init command.
   Che Theia sources will be awailable at `/projects/theia/che/che-theia`.
 - Now one may make changes in Che Theia remote plugin mechanism in both (Che Theia and Remote plugin) sides.
 - Build Che Theia from `theia-dev` container by executing `yarn` in `/projects/theia` folder or by running corresponding command.
 - Put binaries (*.theia or *.vsix) of your remote plugin(s) into `/projects/remote-plugins/` directory.
   Note that the plugin(s) shouldn't have any external dependencies.
   For example, [this sample plugin](https://github.com/eclipse/che-theia-samples/tree/master/samples/hello-world-backend-plugin) might be used.
   Or a user may generate one using `Generate Hello World plugin package` command.
 - Run dev Che Theia and Remote plugins endpoint in `theia-dev` and `theia-remote-runtime-dev` containers correspondingly.
   One may use predefined commands to start them.
 - Open `theia-dev` route from `My Workspace` panel and test chenges.

Also it is possible to run watchers for remote plugin mechanism.
In `theia-dev` container run `npx run watch @eclipse-che/theia-remote` from `/projects/theia` folder to recompile the extension on changes made.
Also run `yarn watch` in `/projects/theia/examples/assembly` to bring the changes to Che Theia binaries.
If needed one may start watchers in plugin API extension: `npx run watch @theia/plugin-ext` from `/projects/theia` directory.
The commands for these actions are also available.
But please note, you have to restart server to which changes is made.
