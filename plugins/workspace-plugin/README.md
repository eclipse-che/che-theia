[![Build Status](https://travis-ci.org/eclipse/che-theia-factory-extension.svg?branch=master)](https://travis-ci.org/eclipse/che-theia-factory-extension)

# Che Theia factory
This Theia plug-in is performing additional actions while creating/starting a Che workspace through a factory URL.
Provides basic factory client side clone feature

- retrieving the factory-id from the URL
- requesting Che factory API to get the factory definition


From the factory definition:
- cloning projects defined in the factory definition
- checking out the right branch if needed
- executing post loading actions such as running CHE commands/tasks or openning a specific file. 

## Testing this extension
### Setting up [deprecated: https://github.com/eclipse/che/issues/11632]
1. Clone [eclipse/che](git@github.com:eclipse/che.git). 
    ```
    $ git clone https://github.com/eclipse/che.git
    $ cd che/dockerfiles/theia
    ```
2.  Add `che-theia-task-extension` to `src/extensions.js`.
    ```
        {
            "name": "@eclipse-che/theia-task-extension",
            "source": "https://github.com/eclipse/che-theia-task-plugin.git",
            "folder": "che-theia-task-extension",
            "checkoutTo": "master",
            "type": "git"
        },
    ```

3. Build the needed "mydockerorg/che-theia:nightly" image with using build script
    ```
   $ ./build.sh --organization:mydockerorg
    ```
4. Push "mydockerorg/che-theia:nightly" image into your repo or use it locally.

5. The following mount should be set in the che.env file: CHE_WORKSPACE_VOLUME=/var/run/docker.sock:/var/run/docker.sock;
Change and restart CHE if it wasn't.

7. Create a new factory from this factory.json file as a working example.  Change  "mydockerorg/che-theia:nightly"  image to your own from steps 3 and 4.
    ```
    {
        "v":"4.0",
        "name":"theiadev_factory",
        "workspace":{
            "environments":{
                "default":{
                    "machines":{
                        "theia":{
                            "attributes":{},
                            "servers":{
                                "theia":{
                                    "attributes":{
                                        "type":"ide"
                                    },
                                    "port":"3000",
                                    "protocol":"http"
                                },
                                "theia-dev":{
                                    "attributes":{
                                        "type":"ide-dev"
                                    },
                                    "port":"3030",
                                    "protocol":"http"
                                }
                            },
                            "volumes":{
                                "projects":{
                                    "path":"/projects"
                                },
                                "theia":{
                                    "path":"/home/theia"
                                }
                            },
                            "installers":[],
                            "env":{}
                        },
                        "machine-exec":{
                            "attributes":{
                                "memoryLimitBytes":"2684354560"
                            },
                            "servers":{
                                "terminal-exec":{
                                    "attributes":{
                                        "type":"terminal"
                                    },
                                    "port":"4444",
                                    "protocol":"ws"
                                }
                            },
                            "volumes":{},
                            "installers":[],
                            "env":{}
                        },
                        "dev-machine":{
                            "attributes":{},
                            "servers":{
                                "theia-dev":{
                                    "attributes":{},
                                    "port":"3030",
                                    "protocol":"http"
                                }
                            },
                            "volumes":{
                                "projects":{
                                    "path":"/projects"
                                }
                            },
                            "installers":[],
                            "env":{}
                        }
                    },
                    "recipe":{
                        "type":"compose",
                        "content":"services:\n machine-exec:\n  image: eclipse/che-machine-exec:latest\n theia:\n  image: mydockerorg/che-theia:nightly\n  mem_limit: 1073741824\n dev-machine:\n  image: eclipse/che-dev:nightly\n  mem_limit: 2147483648\n  depends_on:\n    - theia",
                        "contentType":"application/x-yaml"
                    }
                }
            },
            "defaultEnv":"default",
            "projects":[
                {
                    "links":[],
                    "name":"che-theia-factory",
                    "attributes":{},
                    "type":"typescript",
                    "source":{
                        "location":"https://github.com/eclipse/che-theia-factory-extension.git",
                        "type":"git",
                        "parameters":{
                            "branch":"master"
                        }
                    },
                    "path":"/che-theia-factory",
                    "problems":[],
                    "mixins":[]
                }
            ],
            "name":"theiadev_factory",
            "attributes":{},
            "commands":[
                {
                    "commandLine":"cd /projects/che-theia-factory/\nyarn\nyarn rebuild:browser\ncd /projects/che-theia-factory/browser-app\nmkdir -p /projects/theiadev_projects\nexport CHE_PROJECTS_ROOT=/projects/theiadev_projects\nyarn start /projects/theiadev_projects --hostname=0.0.0.0 --port=3030",
                    "name":"yarn start",
                    "attributes":{
                        "machineName":"theia",
                        "previewUrl":"${server.theia-dev}",
                        "goal":"Build"
                    },
                    "type":"custom"
                },
                {
                    "commandLine":"cd /projects/che-theia-factory/che-theia-factory\nyarn watch",
                    "name":"yarn watch",
                    "attributes":{
                        "goal":"Build",
                        "machineName":"theia"
                    },
                    "type":"custom"
                },
                {
                    "commandLine":"cd /projects/che-theia-factory/browser-app;\nyarn watch",
                    "name":"yarn watch browserapp",
                    "attributes":{
                        "goal":"Build",
                        "machineName":"theia"
                    },
                    "type":"custom"
                }
            ],
            "links":[]
        },
        "ide":{
            "onProjectsLoaded":{
                "actions":[
                    {
                        "properties":{
                            "file":"/che-theia-factory/README.md"
                        },
                        "id":"openFile"
                    },
                    {
                        "properties":{
                            "name":"yarn start"
                        },
                        "id":"runCommand"
                    }
                ]
            }
        }
    }
    ```
### Test the factory extension. [deprecated: See https://github.com/eclipse/che/issues/11632]

When opening the previous factory we expect that it would:

1. Create a new workspace and launch Theia
2. Clone the https://github.com/eclipse/che-theia-factory-extension.git project
3. Open the file README.md of the cloned project.
4. Configure few commands to build and run
5. Run the command (task) that build and run another Theia instance with the cloned factory project. The user should see the output of the command.
6. Be able to access to the "under development" Theia application. Through the preview URL.
