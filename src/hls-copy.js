import "regenerator-runtime/runtime";
import fs from "fs";
import http from "http";
import https from "https";

class HlsCopy {
  constructor() {
    this.masterManifestUrl = null;
    this.baseUrl = null;
    this.outputDirectory = null;
    this.queue = [];
  }


  main([,,url, directory]) {
    console.log(`args: url: ${url} directory: ${directory}`);
    this.isValidInput(url, directory);
    this.masterManifestUrl = url;
    this.baseUrl = url.split('/').slice(0, -1).join('/') + '/';
    this.outputDirectory = directory;
    this.copyHLS()
      .catch(e => {
          console.error("FAILED TO COPY e:" + e);
          process.exit(1);
      });
  }

  async copyHLS() {
    this.queue.push(this.masterManifestUrl);

    while(this.queue.length > 0) {
      const prevQueue = this.queue;
      this.queue = [];
      // promise.all seems to break things. stat getting network timeouts, switched to simple max concurrent system;
      const MAX_CONCURRENT = 15;
      let inFlightRequestCount = 0;
      let inFlightPromise = null;
      await Promise.all(prevQueue.map(async url => {
        const filename = `${this.outputDirectory}/${url.replace(this.baseUrl, "")}`;

        inFlightRequestCount++;
        if (inFlightRequestCount > MAX_CONCURRENT && !inFlightPromise) {
          let tmp;
          inFlightPromise = new Promise((resolve => tmp = resolve));
          inFlightPromise.resolve = tmp;
        }

        if (inFlightPromise) {
          await inFlightPromise;
        }
        await this.downloadFile(url, filename);
        inFlightRequestCount--;
        if (inFlightPromise) {
          let temp;
          temp = inFlightPromise;
          inFlightPromise = null;
          temp.resolve();
        }
        if (/\.m3u8/.test(url)) {
          const manifest = fs.readFileSync(filename, { encoding: 'utf8'});
          const foundUrls = await this.findUrls(manifest, url);
          this.queue = this.queue.concat(foundUrls);
          this.queue = this.queue.filter((value,index) => this.queue.indexOf(value) === index); // ensure unique values
          if (foundUrls.length > 0) {
            console.log("found urls:" + JSON.stringify(foundUrls, null, 2));
          }
        }
      }));
    }
    console.log("DONE");
  }

  async findUrls(manifest, manifestUrl) {
    const manifestFileName = manifestUrl.split('/').pop();

    const uriRegex = /URI="(\S+)"/;

    return manifest
      .split('\n')
      .filter(line => !!line && !(/^\#/.test(line) && !uriRegex.test(line))).map(line => {

        let uri = line;
        if (uriRegex.test(line)){
          let [,matchUrl] = line.match(uriRegex);
          uri = matchUrl;
        }

        if (/^http/.test(uri)) return uri;
        return manifestUrl.replace(manifestFileName, uri);
      });

  }

  async downloadFile(url, destination) {
    const directory = destination.split('/').slice(0,-1).join('/').replace(this.baseUrl, "");

    if (!fs.existsSync(directory)) {
      try {
        fs.mkdirSync(directory,  {recursive: true});
        console.log("created outputDirectory: " + directory);
      } catch (e) {
        console.error("FAILED CREATING DIRECTORY: " + directory + "e: " + e);
        process.exit(1);
      }
    }

    console.log("downloading file: " + url);
    const file = fs.createWriteStream(destination);
    return new Promise((resolve, reject) => {
      ( /^https/.test(url) ? https : http ).get(url, function(response) {
        if (response.statusCode != 200 && response.statusCode != 302) {
          console.error("non-200 response status code:", response.statusCode);
          console.error("for masterManifestUrl:", url);
          return;
        }
        response.pipe(file);
        response.on('end', resolve);
      })
        .on('error', reject)
        .setTimeout( 100000, function( ) {
          reject(new Error("Timeout"));
        });
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
        console.log("created outputDirectory: " + directory);
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