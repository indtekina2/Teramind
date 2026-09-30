const fs = require("fs")
const path = require("path")

// restricted path the AI can't edit 
const restrictedPath = path.join(__dirname, "..", " Restricted")


// edit a single files
async function editFile(path, data) {
    await fs.promises.writeFile(path, data);
    return "File edited successfully";
}

// only given append power
async function appendFile(path, data) {
    await fs.promises.appendFile(path, data);
    return "File appended successfully";
}

// delete a file
async function deleteFile(path) {
    await fs.promises.unlink(path);
    return "File deleted successfully";
}

module.exports = {
    editFile,
    appendFile,
    deleteFile
}
