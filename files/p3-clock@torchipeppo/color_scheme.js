const Settings = imports.ui.settings;
const GLib = imports.gi.GLib;

const UUID = "p3-clock@torchipeppo";
const DESKLET_DIR = imports.ui.deskletManager.deskletMeta[UUID].path;

class ColorScheme {
    constructor(uuid, desklet_id) {
        this.settings = new Settings.DeskletSettings(this, uuid, desklet_id);

        this.settings.bind("global-color-scheme", "color_scheme_name");

        this.load_color_scheme();
    }

    load_color_scheme() {
        // TODO special handling for custom, when we get to it
        let schemes = JSON.parse(String(GLib.file_get_contents(
            DESKLET_DIR + "/default_color_schemes.json"
        )[1]));
        Object.assign(this, schemes[this.color_scheme_name]);
        this._apply_colors_to_svg();
    }

    _apply_colors_to_svg() {
        let svg_content = String(GLib.file_get_contents(
            DESKLET_DIR + "/p3corner-template.svgtemp"
        )[1]);
        svg_content = svg_content.replace(/%corner1%/g, this.corner1);
        svg_content = svg_content.replace(/%corner2%/g, this.corner2);
        GLib.file_set_contents(
            DESKLET_DIR + "/p3corner-custom.svg",
            svg_content,
        );
    }
}