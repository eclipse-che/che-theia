#!/bin/bash

set -e

#build
echo "build..."
docker pull quay.io/eclipse/che-theia-dev:next
docker tag quay.io/eclipse/che-theia-dev:next eclipse/che-theia-dev:next
./build.sh --root-yarn-opts:--ignore-scripts --dockerfile:Dockerfile.$DIST

KUBECTL_VERSION="v1.20.2"
KUBECTL_OWN_PATH="/usr/local/bin/kubectl"
KUBECTL_LINK="https://storage.googleapis.com/kubernetes-release/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl"
sudo curl $KUBECTL_LINK -Lo $KUBECTL_OWN_PATH
sudo chmod +x $KUBECTL_OWN_PATH
echo "kubectl version"
kubectl version --client

npm install -g typescript
export RUNNER_TEMP=/tmp
export GITHUB_ENV=/tmp/github_env
touch $GITHUB_ENV

# Start minikube
echo "Start minikube..."
git clone https://github.com/che-incubator/setup-minikube-action.git
cd setup-minikube-action
SKIP_TEST=true SKIP_FORMAT=true SKIP_LINT=true npm install
env 'INPUT_MINIKUBE-VERSION='$MINIKUBE_VERSION node lib/index.js
cd ..

# Deploy Eclipse Che
echo "Deploy Eclipse Che..."
# modified code to store github action output in a file
git clone https://github.com/che-incubator/che-deploy-action.git
cd che-deploy-action
SKIP_TEST=true SKIP_FORMAT=true SKIP_LINT=true npm install
env 'INPUT_CHECTL-CHANNEL='$CHECTL_CHANNEL node lib/index.js
cd ..

export CHE_URL="https://che-eclipse-che.$(minikube ip).nip.io"

#devfile-che-theia
echo "devfile-che-theia"
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: custom-devfile-deployment
  labels:
    app: customdevfile
spec:
  selector:
    matchLabels:
      app: customdevfile
  template:
    metadata:
      labels:
        app: customdevfile
    spec:
      containers:
      - name: customdevfile
        image: docker.io/httpd:2.4.46-alpine
        ports:
        - containerPort: 80
EOF
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: customdevfile-service
spec:
  type: ClusterIP
  selector:
    app: customdevfile
  ports:
    - port: 80
      targetPort: 80
EOF
cat <<EOF | kubectl apply -f -
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  annotations:
    kubernetes.io/ingress.class: nginx
  name: custom-devfile
spec:
  rules:
  - host: custom-devfile.$(minikube ip).nip.io
    http:
      paths:
      - backend:
          serviceName: customdevfile-service
          servicePort: 80
        path: /
        pathType: ImplementationSpecific
EOF
while [[ $(kubectl get pods -l app=customdevfile -o 'jsonpath={..status.conditions[?(@.type=="Ready")].status}') != "True" ]]; do echo "waiting for pod" && sleep 1; done
while [[ $(kubectl get ingress/custom-devfile -o 'jsonpath={..status.loadBalancer.ingress[0].ip}') != "$(minikube ip)" ]]; do echo "waiting for ingress" && sleep 1; done
DEPLOY_POD_NAME=$(kubectl get pods -l app=customdevfile  -o 'jsonpath={...metadata.name}')

export DEVFILE_CUSTOM_URL=http://custom-devfile.$(minikube ip).nip.io/devfile.yaml
export CHE_THEIA_META_YAML_URL='https://che-plugin-registry-main.surge.sh/v3/plugins/eclipse/che-theia/next/meta.yaml'
wget $CHE_THEIA_META_YAML_URL -O che-theia-meta.yaml
sed -i 's|quay.io/eclipse/che-theia:next|local-che-theia:latest|' che-theia-meta.yaml
sed -i 's|quay.io/eclipse/che-theia-endpoint-runtime-binary:next|local-che-theia-endpoint-runtime-binary:latest|' che-theia-meta.yaml
# patch happy-path-workspace.yaml
wget https://raw.githubusercontent.com/eclipse/che/master/tests/e2e/files/happy-path/happy-path-workspace.yaml -O devfile.yaml
sed -i "s|id: eclipse/che-theia/next|alias: che-theia\n    reference: http://custom-devfile.$(minikube ip).nip.io/che-theia-meta.yaml|" devfile.yaml
kubectl cp che-theia-meta.yaml $DEPLOY_POD_NAME:/usr/local/apache2/htdocs/
kubectl cp devfile.yaml $DEPLOY_POD_NAME:/usr/local/apache2/htdocs/
#export DEVFILE_URL var as github action output devfile-url cannot be used in bash
export DEVFILE_URL="http://custom-devfile.$(minikube ip).nip.io/devfile.yaml"
echo "devfile yaml content from http://custom-devfile.$(minikube ip).nip.io/devfile.yaml is:"
curl http://custom-devfile.$(minikube ip).nip.io/devfile.yaml
echo "che-theia-meta.yaml content from http://custom-devfile.$(minikube ip).nip.io/che-theia-meta.yaml is:"
curl http://custom-devfile.$(minikube ip).nip.io/che-theia-meta.yaml

docker tag eclipse/che-theia:next local-che-theia:latest
docker tag eclipse/che-theia-endpoint-runtime-binary:next local-che-theia-endpoint-runtime-binary:latest
docker save -o che-theia-images.tar local-che-theia:latest local-che-theia-endpoint-runtime-binary:latest
docker image prune -a -f
eval $(minikube docker-env)
docker load --input=che-theia-images.tar
rm che-theia-images.tar

#Run Happy Path test
echo "Run Happy Path test"
git clone https://github.com/che-incubator/happy-path-tests-action.git
cd happy-path-tests-action
SKIP_TEST=true SKIP_FORMAT=true SKIP_LINT=true npm install

env 'INPUT_CHE-URL='$CHE_URL 'INPUT_DEVFILE-URL='$DEVFILE_URL 'INPUT_E2E-VERSION='$CHECTL_CHANNEL node lib/index.js
