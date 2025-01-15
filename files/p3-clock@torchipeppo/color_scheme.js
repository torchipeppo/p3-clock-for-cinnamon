const Settings = imports.ui.settings;
const GLib = imports.gi.GLib;

const UUID = "p3-clock@torchipeppo";
const DESKLET_DIR = imports.ui.deskletManager.deskletMeta[UUID].path;

class ColorScheme {
    constructor(uuid, desklet_id, file_handler) {
        this.file_handler = file_handler;
        this.settings = new Settings.DeskletSettings(this, uuid, desklet_id);

        this.settings.bind("global-color-scheme", "color_scheme_name");
        this.settings.bind("global-custom-corner1", "custom_corner1_color");
        this.settings.bind("global-custom-corner2", "custom_corner2_color");
        this.settings.bind("global-custom-date", "custom_date_color");
        this.settings.bind("global-custom-time", "custom_time_color");
        this.settings.bind("global-custom-time-shadow", "custom_time_shadow_color");
        this.settings.bind("global-custom-bottom", "custom_bottom_color");

        this.load_color_scheme();
    }

    load_color_scheme() {
        // "custom" looks like a special name in the settings_schema
        if (this.color_scheme_name == "the-custom") {
            this.corner1 = this.custom_corner1_color;
            this.corner2 = this.custom_corner2_color;
            this.date = this.custom_date_color;
            this.time = this.custom_time_color;
            this.time_shadow = this.custom_time_shadow_color;
            this.bottom = this.custom_bottom_color;
        }
        else {
            let schemes = JSON.parse(this.file_handler.get_file_text(
                DESKLET_DIR + "/default_color_schemes.json"
            ));
            Object.assign(this, schemes[this.color_scheme_name]);
        }
        this._apply_colors_to_svg();
    }

    _apply_colors_to_svg() {
        let svg_content = this.file_handler.get_file_text(
            DESKLET_DIR + "/p3corner-template.svgtemp"
        );
        svg_content = svg_content.replace(/%corner1%/g, this.corner1);
        svg_content = svg_content.replace(/%corner2%/g, this.corner2);
        GLib.file_set_contents(
            DESKLET_DIR + "/p3corner-custom.svg",
            svg_content,
        );
    }
}