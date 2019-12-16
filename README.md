<br/>
<div id="che-theia-logo" align="center" style="vertical-align: middle">

<img src="https://raw.githubusercontent.com/eclipse/che-theia/master/extensions/eclipse-che-theia-about/src/browser/style/che-logo-light.svg?sanitize=true" alt="Che Logo" width="200" height="60" />

<img src="https://raw.githubusercontent.com/eclipse-theia/theia/master/logo/theia-logo.svg?sanitize=true" alt="Theia Logo" width="150" height="60"/>

# Che Theia


</div>

<div id="badges" align="center">

  [![Build Status](https://ci.centos.org/buildStatus/icon?job=devtools-che-theia-che-build-master)](https://ci.centos.org/view/Devtools/job/devtools-che-theia-che-build-master/)
  [![Build Status](https://ci.centos.org/buildStatus/icon?job=devtools-che-theia-che-nightly)](https://ci.centos.org/view/Devtools/job/devtools-che-theia-che-nightly/)
  [![mattermost](https://img.shields.io/badge/chat-on%20mattermost-blue.svg)](https://mattermost.eclipse.org/eclipse/channels/eclipse-che-ide2-team)
  [![Open questions](https://img.shields.io/badge/Open-questions-blue.svg?style=flat-curved)](https://github.com/eclipse/che/issues?utf8=%E2%9C%93&q=label%3Aarea%2Ftheia+label%3Akind%2Fquestion+)
  [![Open bugs](https://img.shields.io/badge/Open-bugs-red.svg?style=flat-curved)](https://github.com/eclipse/che/issues?utf8=%E2%9C%93&q=label%3Aarea%2Ftheia+label%3Akind%2Fbug+)

</div>

<div style='margin:0 auto;width:80%;'>

![Che-Theia](https://raw.githubusercontent.com/eclipse/che-theia/master/che-theia-screenshot.png)

</div>

## What is Che-theia ?
[Eclipse Che](https://eclipse.org/che/) provides a default web IDE for the workspaces which is based on the [Theia](https://github.com/eclipse-theia/theia) project. It’s a subtle different version than a plain  Theia(https://github.com/eclipse-theia/theia) as there are functionalities that have been added based on the nature of the Eclipse Che workspaces. We are calling this version of Eclipse Theia for Che: Che-Theia.

So, Che-Theia is the default `Che editor` provided with developer workspaces created in [Eclipse Che 7](https://eclipse.org/che/)([Github](https://github.com/eclipse/che)).

Che-Theia contains additional extensions and plugins which have been added based on the nature of Eclipse Che workspaces and to provide the best IDE experience of Theia within Che.
 - A VSCode-like IDE experience. Che-Theia is based on the monaco
   editor and includes features like the command pallete.
 - VSCode extension compatibility. Che-Theia supports VSCode
   extensions. In Che-theia, these extensions could come with a side-car
   containers with all the dependencies required by the extension.
   No need to install the JDK or Maven when you install our VSCode Java plugin.
 - Nice views to interact with your user containers or production runtime containers.
   (Terminal access, execute Che-commands in specific containers, etc...)

## Che-Theia capabilities
In Che-Theia, you’ll find the following capabilities:


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

- [dockerfiles](./dockerfiles) contains Dockerfiles for plugin sidecars, theia-editor and theia builder,
- [extensions](./extensions) contains Che-Theia specific extensions,
- [plugins](./plugins) contains Che-Theia plugins.
- [generator](./generator) contains Che-Theia [generator](./generator/README.md)

Che-theia editor is a container image which contains the Che-theia IDE web application.

The che-plugin of this editor is defined in the plugin registry https://github.com/eclipse/che-plugin-registry/blob/master/v3/plugins/eclipse/che-theia/next/meta.yaml

[dockerfiles/theia](./dockerfiles/theia) folder contains the container image sources of `eclipse/che-theia`:
- Using a Docker multistage build and [dockerfiles/theia-dev](./dockerfiles/theia-dev) as builder.
- Cloning [Theia](https://github.com/eclipse-theia/theia)
- Using `che:theia init` command to decorate Theia with Che-theia plugins and extensions. All plugins and extensions are defined in [che-theia-init-sources.yml](./che-theia-init-sources.yml)
- Using `yarn` to build theia + che-theia extensions + che-theia plugins
- Assembling everything and using `che:theia production` to make the che-theia webapp.
- Copying the che-theia webapp into the runtime container and creating the Che-theia image.

# Contributing

## Contribute to Che-theia
Contributing to che-theia section is cover in [CONTRIBUTING.md](https://github.com/eclipse/che-theia/blob/master/CONTRIBUTING.md)


## Build container images

Building images is required only if you make some changes on `Dockerfile`s inside `dockerfiles` folder.
If it is about testing che-theia extensions or plugins, please refere to [CONTRIBUTING.md](https://github.com/eclipse/che-theia/blob/master/CONTRIBUTING.md).

To build che-theia docker images, please follow [dockerfiles/theia/README.md](https://github.com/eclipse/che-theia/blob/master/dockerfiles/theia/README.md) instructions.


# License

- [Eclipse Public License 2.0](LICENSE)

# Join the community

The Eclipse Che community is globally reachable through public chat rooms, mailing list and weekly calls.
See https://www.eclipse.org/che/docs/che-7/index.html#joining-the-community

Che-Theia is mainly maintained by the Che IDE2 team a.k.a Selene.
You are very welcome to join our community chat [here](https://mattermost.eclipse.org/eclipse/channels/eclipse-che-ide2-team) to discuss about improvements, bug fixes and anything else.

## Report issues

Issues are tracked on the main Eclipse Che Repository: https://github.com/eclipse/che/issues
