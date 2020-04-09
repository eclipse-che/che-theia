# @eclipse-che/theia-generator


# Contributing to this CLI

This project is using yargs to manage CLI options. [See src/yargs.ts file](src/yargs.ts)

## Code formatter/linter
when doing `yarn` command, formatter is executed with linter, etc.

## Unit tests
jest is used to test the project.

`yarn run test` is launching all the tests. A code coverage is also reported in `./coverage` folder.

Try to expect 100% of coverage when implementing a feature (for now only yargs.ts is not covered as I haven't figured out a good way to test it, welcome !)
