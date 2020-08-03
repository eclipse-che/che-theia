# Automated Built-In Extensions Report

### Report accurate as of: {{reportTime}} UTC / (took {{computeTime}}s)
| Extension Name | Che-Theia Version | Theia Version | Error |
| ------ | ------ | ------ | ------
{{#each entries}}
| {{this.extensionName}} | {{this.cheTheiaVersion}} | {{#if this.needsUpdating}}**{{/if}}{{this.theiaVersion}}{{#if this.needsUpdating}}**{{/if}} | {{this.errors}} 
{{/each}}
