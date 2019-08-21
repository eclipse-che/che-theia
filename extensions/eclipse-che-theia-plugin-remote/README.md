
### How to develop Che Theia remote plugin mechanism

_Please note, this doc provides a flow how to develop remote plugin mechanism in Che Theia, but not a remoute plugin._

First, create a workspace from prepared devfile, which could be found in the extension folder.
When workspace is ready:
 - Init Che Theia. This could be done with `che:theia init` command in `/projects/theia` folder or run the init command.
   Che Theia sources will be awailable at `/projects/theia/che/che-theia`.
 - Now one may make changes in Che Theia remote plugin mechanism in both (Che Theia and Remote plugin) sides.
 - Build Che Theia from `theia-dev` container by executing `yarn` in `/projects/theia` folder or by running corresponding command.
 - Put your remote plugin(s) into `/projects/remote-plugins/` dorectory.
   Note that the plugins shouldn't have any external dependencies.
 - Run dev Che Theia and Remote plugins endpoint in `theia-dev` and `theia-remote-runtime-dev` containers correspondingly.
   One may use predefined commands to start them.
 - Open `theia-dev` route from `My Workspace` panel and test chenges.

Also it is possible to run watchers for remote plugin mechanism.
In `theia-dev` container run `npx run watch @eclipse-che/theia-remote` from `/projects/theia` folder to recompile the extension on changes made.
Also run `yarn watch` in `/projects/theia/examples/assembly` to bring the changes to Che Theia binaries.
The command for this is also available.
