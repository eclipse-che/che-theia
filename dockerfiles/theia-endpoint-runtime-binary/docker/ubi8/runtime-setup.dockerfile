# install yq from local wheels we fetched earlier 
RUN pip3 --version && cd /tmp && pip3 install *.whl && rm -fr /tmp/*.whl && yq --version
