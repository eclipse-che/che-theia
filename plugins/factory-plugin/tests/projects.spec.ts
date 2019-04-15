/*
 * Copyright (c) 2019 Red Hat, Inc.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */
import { che as cheApi } from "@eclipse-che/api";
import * as projecthelper from "../src/projects";

describe("Testing projects updater when file is triggered", () => {

    test("update and create project", async () => {
        let projects: cheApi.workspace.ProjectConfig[] = [
            {
                "name": "theia",
                "attributes": {},
                "source": {
                    "location": "https://github.com/theia-ide/theia.git",
                    "type": "git",
                    "parameters": {}
                },
                "path": "/theia",
                "description": "",
                "mixins": [],
                "problems": []
            },
            {
                "links": [],
                "name": "che-theia-factory-extension",
                "attributes": {},
                "type": "blank",
                "source": {
                    "location": "https://github.com/eclipse/che-theia-factory-extension.git",
                    "type": "git",
                    "parameters": {
                        "branch": "master",
                        "tag": "v42.0"
                    }
                },
                "path": "/che-theia-factory-extension",
                "description": "",
                "mixins": [],
                "problems": []
            }
        ];
        expect(projects[0].source.location).toBe("https://github.com/theia-ide/theia.git");
        expect(projects[1].source.location).toBe("https://github.com/eclipse/che-theia-factory-extension.git");


        projecthelper.updateOrCreateGitProject(projects, '/che-theia-factory-extension', 'https://github.com/sunix/che-theia-factory-extension.git', 'wip-sunix');
        expect(projects[1].source.location).toBe("https://github.com/sunix/che-theia-factory-extension.git");
        expect(projects[1].source.parameters['branch']).toBe("wip-sunix");
        expect(projects[1].source.parameters['tag']).toBe(undefined);

        projecthelper.updateOrCreateGitProject(projects, '/che/che-theia-factory-extension', 'https://github.com/sunix/che-theia-factory-extension.git', 'wip-theia');
        expect(projects[2].source.location).toBe("https://github.com/sunix/che-theia-factory-extension.git");
        expect(projects[2].source.parameters['branch']).toBe("wip-theia");
        expect(projects[2].name).toBe("che-theia-factory-extension");
    });

    test("delete project", async () => {
        let projects: cheApi.workspace.ProjectConfig[] = [
            {
                "name": "theia",
                "attributes": {},
                "source": {
                    "location": "https://github.com/theia-ide/theia.git",
                    "type": "git",
                    "parameters": {}
                },
                "path": "/theia",
                "description": "",
                "mixins": [],
                "problems": []
            },
            {
                "links": [],
                "name": "che-theia-factory-extension",
                "attributes": {},
                "type": "blank",
                "source": {
                    "location": "https://github.com/eclipse/che-theia-factory-extension.git",
                    "type": "git",
                    "parameters": {
                        "branch": "master"
                    }
                },
                "path": "/che-theia-factory-extension",
                "description": "",
                "mixins": [],
                "problems": []
            }
        ];
        expect(projects[0].source.location).toBe("https://github.com/theia-ide/theia.git");
        expect(projects[1].source.location).toBe("https://github.com/eclipse/che-theia-factory-extension.git");

        projecthelper.deleteGitProject(projects, '/che-theia-factory-extension');
        expect(projects.length).toBe(1);
        expect(projects[0].source.location).toBe("https://github.com/theia-ide/theia.git");

        projecthelper.deleteGitProject(projects, '/theia');
        expect(projects.length).toBe(0);

        projecthelper.updateOrCreateGitProject(projects, '/che/che-theia-factory-extension', 'https://github.com/sunix/che-theia-factory-extension.git', 'wip-theia');
        expect(projects[0].source.location).toBe("https://github.com/sunix/che-theia-factory-extension.git");
        expect(projects[0].source.parameters['branch']).toBe("wip-theia");
        expect(projects[0].name).toBe("che-theia-factory-extension");

        projecthelper.deleteGitProject(projects, '/che/che-theia-factory-extension');
        expect(projects.length).toBe(0);
    });
});
