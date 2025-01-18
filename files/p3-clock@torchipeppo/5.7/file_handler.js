const GLib = imports.gi.GLib;

// making this a class just to keep a door open in the off-chance that
// the encoding of the text files needs to be configurable
class FileHandler {
    constructor(uuid, desklet_id) {
        this.text_decoder = new TextDecoder();
        // this.settings = new Settings.DeskletSettings(this, uuid, desklet_id);
    }

    get_file_text(fname) {
        return this.text_decoder.decode(GLib.file_get_contents(fname)[1]);
    }
}