const fs = require("fs")
const path = require("path")

// the restricted path the ai can use tool to read the files
const restrictedPath = path.join(__dirname, "..", " Restricted")

// read a single files
async function readFile(path) {
    let Data = await fs.promises.readFile(path, "utf-8");
    return Data;
}

// read all files in a folder
async function readAllFiles(folderPath) {
    let files = await fs.promises.readdir(folderPath);
    let data = [];
    for (let file of files) {
        let path = folderPath + "/" + file;
        let fileData = await readFile(path);
        data.push({
            file: file,
            data: fileData
        });
    }
    return data;
}

// get lists of files and folders
async function getFilesAndFolders(folderPath) {
    let files = await fs.promises.readdir(folderPath);
    let data = [];
    for (let file of files) {
        let path = folderPath + "/" + file;
        let fileData = await readFile(path);
        data.push({
            file: file,
            data: fileData
        });
    }
    return data;
}

module.exports = {
    readFile,
    readAllFiles,
    getFilesAndFolders
}