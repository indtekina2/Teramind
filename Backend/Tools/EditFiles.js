const fs = require("fs")
const path = require("path")

// AI can only edit this restricted path
const restrictedPath = path.join(__dirname, "..", "Restricted")


// edit a single files
async function editFile(path, data) {
    if (path.startsWith(restrictedPath)) {
        await fs.promises.writeFile(path, data);
        return "File edited successfully";
    }
    else {
        return "You can't edit this file";
    }
}

// only given append power
async function appendFile(path, data) {
    if (path.startsWith(restrictedPath)) {
        await fs.promises.appendFile(path, data);
        return "File appended successfully";
    }
    else {
        return "You can't append this file";
    }
}

// delete a file
async function deleteFile(path) {
    if (path.startsWith(restrictedPath)) {
        await fs.promises.unlink(path);
        return "File deleted successfully";
    }
    else {
        return "You can't delete this file";
    }
}

module.exports = {
    editFile,
    appendFile,
    deleteFile
}
