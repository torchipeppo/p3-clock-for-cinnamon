const GLib = imports.gi.GLib;
const ByteArray = imports.byteArray;

const UUID = "p3-clock@torchipeppo";
const DESKLET_DIR = imports.ui.deskletManager.deskletMeta[UUID].path;

let FileHandlerBase;
if (typeof require !== 'undefined') {
    FileHandlerBase = require("./file_handler_base");
}
else {
    imports.searchPath.push(DESKLET_DIR);
    FileHandlerBase = imports.file_handler_base;
}

// making this a class just to keep a door open in the off-chance that
// the encoding of the text files needs to be configurable
class FileHandler extends FileHandlerBase.FileHandlerBase {
    constructor(uuid, desklet_id) {
        super(uuid, desklet_id);
        // this.settings = new Settings.DeskletSettings(this, uuid, desklet_id);
    }

    byte_array_to_string(ba) {
        return ByteArray.toString(ba);
    }
}
