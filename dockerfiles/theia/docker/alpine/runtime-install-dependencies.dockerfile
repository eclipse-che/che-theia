# Install sudo
# Install git
# Install bzip2 to unpack files
# Install which tool in order to search git
# Install curl and bash
# Install ssh for cloning ssh-repositories
# Install less for handling git diff properly
RUN apk add --update --no-cache sudo git bzip2 which bash curl openssh openssh-keygen less
