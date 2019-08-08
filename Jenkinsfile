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
    }

    stages {

        stage("Prepare to start Che on OKD") {
            failFast true

        }
                stage("Download oc client") {
                    steps {
                        script {
                            sh """
  wget --no-verbose https://github.com/che-incubator/chectl/releases/latest/download/chectl-linux -O ${WORKSPACE}/chectl
  sudo chmod +x ${WORKSPACE}/chectl
"""
                        }
                    }
                }
    }
}
