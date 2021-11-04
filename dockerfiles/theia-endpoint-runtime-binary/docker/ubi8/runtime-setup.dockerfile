# curl already installed in ubi8
RUN microdnf install -y python38 jq && pip3 install yq
