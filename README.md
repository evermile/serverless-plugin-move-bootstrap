# ⚡️Serverless Framework Move Bootstrap Plugin

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![npm](https://img.shields.io/npm/v/serverless-go-plugin)](https://www.npmjs.com/package/serverless-go-plugin)

`serverless-plugin-move-bootstrap` is a small Serverless Framework plugin that helps in rearranging a deployment package
for the provided.al2 runtime by placing the "bootstrap" executable in the root directory. Once the plugin is installed
it will search for the "handler" file and move it to the root directory of the package.

## Install

1. Install the plugin

    ```
    npm i --save-dev serverless-plugin-move-bootstrap
    ```

1. Add it to your `serverless.yaml`

    ```
    plugins:
      - serverless-plugin-move-bootstrap
    ```

## Configuration

Default values:

```
custom:
  bootstrap:
    tmpDir: .serverless/tmp # folder to use for extracting, moving and rezipping files
```

## How does it work?

The plugin goes over all the functions defined, unzips their packaging and moves the "handler" to a root-level '
bootstrap' file. It then re-zips the package and cleans up the temp directory, ahead of deployment.

## Why do I need this?

The `provided.al2` runtime requires the "bootstrap" file to be in the root directory of the package. This plugin helps
in achieving that.