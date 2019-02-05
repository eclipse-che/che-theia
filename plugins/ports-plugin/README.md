# Ports Plug-in
This plug-in is checking network and detect when new ports are listening or closed.

If a process is listening, it will check
- if listening interface is 127.0.0.1/::1 it asks the user to create a redirect for this port so it will externally available
- if listening remotely:
     - if there is a workspace server that is matching for this port, display the URL of this server and propose to open the link.
     - if there is no workspace server matching, propose the user to do a port redirect.


Port redirect mechanism:
  - Check servers ports defined with the prefix name `theia-redirect-``
  - take the first available one and create port traffic redirect to this port
  - if no port is available or if no server with prefix is available
     - display an error message saying that a new port is listening and that a server needs to be added in workspace configuration.    
