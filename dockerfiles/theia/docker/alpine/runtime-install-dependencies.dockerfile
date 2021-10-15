# Install sudo
# Install git
# Install git-lfs for Large File Storage
# Install bzip2 to unpack files
# Install which tool in order to search git
# Install curl and bash
# Install ssh for cloning ssh-repositories
# Install less for handling git diff properly
# Install sshpass for handling passwords for SSH keys
# Install lsblk as Theia requires it
# Install libsecret as Theia requires it
RUN apk add --update --no-cache sudo git git-lfs bzip2 which bash curl openssh openssh-keygen less sshpass lsblk libsecret
