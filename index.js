const merge = require("lodash.merge");
const pMap = require("p-map");
const os = require("os");
const prettyHrtime = require("pretty-hrtime");
const chalk = require("chalk");
const AdmZip = require("adm-zip");
const fs = require("fs");

const ConfigDefaults = {
  tmpDir: ".serverless/tmp",
};

// amazonProvidedRuntimes contains Amazon Linux runtimes. Update this array after each new version release.
const amazonProvidedRuntimes = ["provided.al2"];

module.exports = class Plugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options || {};

    this.hooks = {
      "before:deploy:function:packageFunction":
        this.ensureIndividually.bind(this),
      "package:createDeploymentArtifacts": this.moveBootstraps.bind(this),
      "before:package:finalize": this.cleanupTmpDir.bind(this),
    };
  }

  ensureIndividually(name, func) {
    this.serverless.service.functions[name].package.individually = true;
  }

  async moveBootstraps() {
    let names = Object.keys(this.serverless.service.functions);

    const timeStart = process.hrtime();
    await pMap(
      names,
      async (name) => {
        const func = this.serverless.service.functions[name];
        await this.moveBootstrap(name, func);
      },
      { concurrency: os.cpus().length }
    );

    let moveTime = process.hrtime(timeStart);
    if (moveTime[0] === 0) {
      this.serverless.cli.consoleLog(
        "Sleeping for 500 ms to make sure we don't get a race which breaks the HMAC signature"
      );
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    moveTime = process.hrtime(timeStart);

    this.serverless.cli.consoleLog(
      `Bootstrap move Plugin: ${chalk.yellow(
        "Move time: " + prettyHrtime(moveTime)
      )}`
    );
  }

  async moveBootstrap(name, func) {
    const config = this.getConfig();

    const runtime = func.runtime || this.serverless.service.provider.runtime;
    if (!amazonProvidedRuntimes.includes(runtime)) {
      this.serverless.cli.consoleLog(
        runtime + " is not a supported runtime for this plugin"
      );
      return;
    }

    let handler = func.handler;

    const zipFile = ".serverless/" + name + ".zip";
    this.serverless.cli.consoleLog("Working on file: " + zipFile);
    const targetDir = config.tmpDir + "/" + name;
    const newPath = targetDir + "/bootstrap";

    const zip = new AdmZip(zipFile);
    zip.extractAllTo(targetDir, true);
    return new Promise((resolve, reject) => {
      fs.rename(targetDir + "/" + handler, newPath, function (err) {
        if (err) {
          this.serverless.cli.consoleLog("ERROR: " + err);
          reject();
        }
        const dirToDelete = handler.split("/")[0];
        fs.rm(targetDir + "/" + dirToDelete, { recursive: true }, (err) => {
          if (err) {
            this.serverless.cli.consoleLog("ERROR: " + err);
            reject();
          }
          fs.chmod(newPath, 0o755, function (err) {
            if (err) {
              this.serverless.cli.consoleLog("ERROR: " + err);
              reject();
            }
            // Zip it back up
            var newZip = new AdmZip();
            newZip.addLocalFolder(targetDir);
            newZip.writeZip(zipFile);
            resolve();
          });
        });
      });
    });
  }

  cleanupTmpDir() {
    const config = this.getConfig();
    fs.access(config.tmpDir, fs.F_OK, (err) => {
      if (err) {
        return;
      }

      //file exists
      fs.rm(config.tmpDir, { recursive: true }, (err) => {
        if (err) this.serverless.cli.consoleLog("ERROR: " + err);
      });
    });
  }

  getConfig() {
    let config = ConfigDefaults;
    if (
      this.serverless.service.custom &&
      this.serverless.service.custom.bootstrap
    ) {
      config = merge(config, this.serverless.service.custom.bootstrap);
    }
    return config;
  }
};
