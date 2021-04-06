# Contributing to che-theia with no source linking
This document describes how to develop for che-theia using yarn linking instead of soure links

# Developing against @theia:next
The simplest way to program che-theia is to develop against latest "next" tag of theia published
to npmjs.

1. Check out the source code of che-theia

        cd /projects
        git clone https://github.com/eclipse-che/che-theia
2. Generate the che-theia assembly folder

         cd che-theia
         che-theia generate

   This will generate a theia application that will include the necessary theia and che-theia extensions

3. Build the project
        
        yarn
   This builds all parts of che-theia. You are now ready to run che-theia. For example, you can execute `yarn run start` inside the `assembly` folder

# Building against Theia source code
To build against a Theia version built from source, we need to clone the Theia repository and set up yarn linking
to use that version in che-theia.

1. Clone Theia

        cd /projects
        git clone https://github.com/eclipse-theia/theia
        git checkout <the branch you want to build against>
2. Build theia

        cd /projects/theia
        yarn
3. Link into che-theia

        cd /projects/che-theia
        che-theia link
   This will `yarn link` all necessary modules from the Theia source into the node modules folder inside the 
   che-theia project. At this time, it's a good idea to rebuild the che-theia project:
4. Rebuild che-theia

        rm yarn.lock
        yarn
