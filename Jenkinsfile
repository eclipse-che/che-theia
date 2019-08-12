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
        CHE_WORKSPACE_JAVA__OPTIONS='-Xmx2500m'
        CHE_WORKSPACE_MAVEN__OPTIONS='-Xmx2500m'
    }

    tage("Download and set up OC client") {
        steps {
            script {
                sh """
  cd /tmp
  wget https://github.com/openshift/origin/releases/download/v3.11.0/openshift-origin-client-tools-v3.11.0-0cbc58b-linux-64bit.tar.gz
  tar -xvf /tmp/openshift-origin-client-tools-v3.11.0-0cbc58b-linux-64bit.tar.gz
  mv openshift-origin-client-tools-v3.11.0-0cbc58b-linux-64bit/* .
  
  #workaround for https://github.com/openshift/origin/issues/21404 in CCI
  sudo mount --bind --make-rshared . .
  
  
"""
            }
        }

    }


    stages {

        stage("Build  Che - Theia image and push to Docker registry") {
            failFast true
            parallel {

                stage("Prepare to start Che on OKD") {
                    steps {
                        script {
                            sh """
sh "echo1 >>>>"
  
"""
                        }
                    }

                }

                stage("Prepare to start Che on OKD infra") {
                    steps {
                        script {
                            sh "echo2 >>>>"

                        }
                    }

                }

            }
        }
    }

}