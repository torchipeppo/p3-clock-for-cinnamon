const GLib = imports.gi.GLib;

const UUID = "p3-clock@torchipeppo";
const DESKLET_DIR = imports.ui.deskletManager.deskletMeta[UUID].path;

// making this a class just to keep a door open in the off-chance that
// the encoding of the text files needs to be configurable
class FileHandlerBase {
    constructor(uuid, desklet_id) {
        // this.settings = new Settings.DeskletSettings(this, uuid, desklet_id);
    }

    get_file_text(fname) {
        return this.byte_array_to_string(GLib.file_get_contents(fname)[1]);
    }

    get_path_to_file(local_path) {
        let absolute_dir = DESKLET_DIR;
        while (absolute_dir) {
            if (GLib.file_test(absolute_dir + "/" + local_path, GLib.FileTest.EXISTS)) {
                return absolute_dir + "/" + local_path;
            }
            let last_slash_index = absolute_dir.lastIndexOf("/");
            if (last_slash_index == -1 || absolute_dir.endsWith(UUID)) {
                break;
            }
            absolute_dir = absolute_dir.substring(0, last_slash_index);
        }
        return null
    }
}
