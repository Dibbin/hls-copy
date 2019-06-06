import "regenerator-runtime/runtime";
import fs from "fs";
import http from "http";
import https from "https";

class HlsCopy {
  constructor() {
    this.masterManifestUrl = null;
    this.directory = null;
  }


  main([,,url, directory]) {
    console.log(`args: url: ${url} directory: ${directory}`);
    this.isValidInput(url, directory);
    this.masterManifestUrl = url;
    this.directory = directory;
    this.copyHLS()
      .catch(e => {
          console.error("FAILED TO COPY e:" + e);
          process.exit(1);
      });
  }

  async copyHLS() {
    await this.downloadFile(this.masterManifestUrl, `${this.directory}/${this.masterManifestUrl.split('/').reverse()[0]}`);
    console.log("DONE");
  }

  async downloadFile(url, destination) {
    console.log("downloading file: " + url);
    const file = fs.createWriteStream(destination);
    return new Promise((resolve, reject) => {
      ( /^https/.test(url) ? https : http ).get(url, function(response) {
        if (response.statusCode != 200) {
          console.error("non-200 response status code:", response.statusCode);
          console.error("for masterManifestUrl:", url);
          return;
        }
        response.pipe(file);
        response.on('end', resolve);
      }).on('error', reject);
    })

  }

  isValidInput(url, directory) {
    if (!this.isValidUrl(url) || !/\.m3u8/.test(url)) {
      console.error("INVALID URL");
      process.exit(1);
    }

    if (fs.existsSync(directory) && !fs.lstatSync(directory).isDirectory()) {
      console.error("INVALID DIRECTORY");
      process.exit(1);
    } else if (!fs.existsSync(directory)) {
      try {
        fs.mkdirSync(directory,  {recursive: true});
        console.log("created directory: " + directory);
      } catch (e) {
        console.error("FAILED CREATING DIRECTORY: " + directory + "e: " + e);
        process.exit(1);
      }
    }
  }

  isValidUrl(string){
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }
}

const instance = new HlsCopy();

instance.main(process.argv);