import fs from "fs";

class HlsCopy {
  main([,,url, directory]) {
    console.log(`args: url: ${url} directory: ${directory}`);
    this.isValidInput(url, directory);
  }

  isValidInput(url, directory) {
    if (!this.isValidUrl(url) || !/\.m3u8/.test(url)) {
      console.error("INVALID URL");
      process.exit(1);
    }

    if (fs.existsSync(directory) && !fs.isDirectory(directory)) {
      console.error("INVALID DIRECTORY");
      process.exit(1);
    } else if (!fs.existsSync(directory)) {
      try {
        fs.mkdirSync(directory);
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