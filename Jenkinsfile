pipeline {
    agent { label 'codenvy-slave9' }

    options {
        timestamps()
        timeout(time: 40, unit: 'MINUTES')
        buildDiscarder(logRotator(artifactDaysToKeepStr: '',
                artifactNumToKeepStr: '', daysToKeepStr: '60', numToKeepStr: '100'))
    }

    environment {
        OC_BINARY_DOWNLOAD_UR = "https://github.com/openshift/origin/releases/download/v3.11.0/openshift-origin-client-tools-v3.11.0-0cbc58b-linux-64bit.tar.gz"
        JENKINS_BUILD = "true"

        DEVFILE_URL = "${WORKSPACE}/e2e/files/happy-path/happy-path-workspace.yaml"
        SUCCESS_THRESHOLD = 5
        CHE_IMAGE_REPO = "maxura/che-server"
        CHE_IMAGE_TAG = "${ghprbPullId}"
        CHE_WORKSPACE_JAVA__OPTIONS = '-Xmx2500m'
        CHE_WORKSPACE_MAVEN__OPTIONS = '-Xmx2500m'
    }
    stages {
        stage("Download and set up OC client") {
            steps {
                script {
                    sh """
                        cd /tmp
                        wget $OC_BINARY_DOWNLOAD_UR
                        tar -xvf /tmp/openshift-origin-client-tools-v3.11.0-0cbc58b-linux-64bit.tar.gz
                        mv openshift-origin-client-tools-v3.11.0-0cbc58b-linux-64bit/* .
                  
                        #workaround for https://github.com/openshift/origin/issues/21404 in CCI
                        sudo mount --bind --make-rshared . .
                      """
                }
            }
        }

        stage("Build Theia image and launch OKD") {
            failFast true
            parallel {
                stage("Build  Che - Theia image and push to Docker registry") {
                    steps {
                        withCredentials([string(credentialsId: 'ed71c034-60bc-4fb1-bfdf-9570209076b5', variable: 'maxura_docker_password')]) {
                            script {
                                sh """ 
                                ${WORKSPACE}/build.sh --pr --skip-tests
                                docker tag eclipse/che-theia:next maxura/che-theia:${ghprbPullId}
                                docker login -u maxura -p ${password}
                                docker push maxura/che-theia:${ghprbPullId}
                               """
                            }
                        }

                    }
                }

                stage("Start Che on OKD infra") {
                    steps {
                        script {
                            sh "${WORKSPACE}/che/deploy/openshift/ocp.sh --run-ocp --deploy-che --project=che"

                        }
                    }

                }

            }
        }
    }

}