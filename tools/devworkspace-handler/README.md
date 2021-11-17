#### What is DevWorkspace Handler?
The library is used by Dashboard component to analyze `.che-theia/che-theia-plugins.yaml` and `.vscode/extensions.json` files and then enhance the DevWorkspace components and DevWorkspace templates.

#### How to use the library
The library is mainly used by dashboard component but there is a way to try it as a standalone library.

Example:
`$ node lib/entrypoint.js --devfile-url:https://github.com/che-samples/java-spring-petclinic/tree/devfilev2 --output-file:/tmp/all-in-one.yaml`

The file `/tmp/all-in-one.yaml` contains a DevWorkspace based on the repository devfile and a Che-Theia DevWorkspaceTemplate.
If DevWorkspace engine is available on the cluster, the following command will create a DevWorkspace:
`$ kubectl apply -f /tmp/all-in-one.yaml`
