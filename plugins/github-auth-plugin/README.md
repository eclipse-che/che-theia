# Theia - vscode Github pull-request plugin authenticator

The plugin calls Che oAuth API service to get the GitHub token.
Then it injects it to the user preferences. When the browser page is refreshed,
the vscode GitHub PR plugin fetches the token and cleans the token from the preferences file.

## License

[EPL-2.0](http://www.eclipse.org/legal/epl-2.0)
