# install yq from local wheels we fetched earlier 
RUN pip3 --version && pip3 install /tmp/*.whl && yq --version && rm -fr /tmp/*.whl 
