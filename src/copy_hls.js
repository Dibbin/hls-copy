import fs from "fs";


const dir = './tmp';

if (!fs.existsSync(dir)){
  fs.mkdirSync(dir);
}

console.log('created tmp folder')