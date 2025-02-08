const Settings = imports.ui.settings;
const GLib = imports.gi.GLib;

const UUID = "p3-clock@torchipeppo";
const DESKLET_DIR = imports.ui.deskletManager.deskletMeta[UUID].path;

class ColorScheme {
    constructor(uuid, desklet_id, file_handler) {
        this.file_handler = file_handler;
    }

    load_color_scheme(color_scheme_name, custom_scheme, invert_bottom_colors) {
        // just "custom" would have looked too much like some reserved name
        if (color_scheme_name == "the-custom") {
            Object.assign(this, custom_scheme);
        }
        else {
            let schemes = JSON.parse(this.file_handler.get_file_text(
                this.file_handler.get_path_to_file("default_color_schemes.json")
            ));
            Object.assign(this, schemes[color_scheme_name]);
        }
        if (invert_bottom_colors) {
            [this.corner2, this.bottom] = [this.bottom, this.corner2];
        }
    }

    get_svg() {
        let svg_content = this.file_handler.get_file_text(
            this.file_handler.get_path_to_file("p3corner-template.svgtemp")
        );
        let svg_attributes = /<svg([^>]*)>/.exec(svg_content)[1];
        let width = Number(/width="([^"]*)"/.exec(svg_attributes)[1]);
        let height = Number(/height="([^"]*)"/.exec(svg_attributes)[1]);
        svg_content = svg_content.replace(/%corner1%/g, this.corner1);
        svg_content = svg_content.replace(/%corner2%/g, this.corner2);
        return [svg_content, width, height];
    }
}