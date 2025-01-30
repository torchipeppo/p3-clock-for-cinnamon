#!/usr/bin/python3

import sys
import json
import traceback

import gi
gi.require_version("Gtk", "3.0")
gi.require_version("GLib", "2.0")
from gi.repository import Gtk, GLib

import gettext
UUID = "p3-clock@torchipeppo"
gettext.install(UUID, GLib.get_home_dir() + '/.local/share/locale')



def log(message):
    with open("/tmp/saveDialog-log.txt", "a") as f:
        f.write(str(message) + "\n")
    print(message, file=sys.stderr)

def main():
    to_save = json.loads(sys.argv[1])

    # TODO can I filter for JSON files only?
    # TODO can I get an automatic overwrite confirm dialog...?
    saver = Gtk.FileChooserDialog(
        _('Save'),
        None,
        Gtk.FileChooserAction.SAVE,
        (
            Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL,
            Gtk.STOCK_SAVE, Gtk.ResponseType.OK
        ),
    )
    response = saver.run()
    if response == Gtk.ResponseType.OK:
        file_path = saver.get_filename()
        with open(file_path, "w") as f:
            json.dump(to_save, f, indent=4)

    saver.destroy()

main()
