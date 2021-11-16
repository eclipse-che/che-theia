#### What is DevWorkspace Handler?
The library that analyzes `.che-theia/che-theia-plugins.yaml` + `.vscode/extensions.json` files and adds the corresponding annotations/components to the DevWorkspace templates.

#### How to use the library
`$ node lib/entrypoint.js --sidecar-policy:"useDevContainer" --devfile-url:https://github.com/benoitf/spring-petclinic/tree/5da9e7f80b66b1fc456faa038c40c848dbd4d50e --output-file:/tmp/all-in-one.yaml`

`$ kubectl apply -f /tmp/all-in-one.yaml`
