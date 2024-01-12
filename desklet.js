const Desklet = imports.ui.desklet;
const St = imports.gi.St;
const GdkPixbuf = imports.gi.GdkPixbuf;
const Clutter = imports.gi.Clutter;
const Cogl = imports.gi.Cogl;

const UUID = "p3-clock@torchipeppo";
const DESKLET_DIR = imports.ui.deskletManager.deskletMeta[UUID].path;

/*
    TODO
    - Ci sono un sacco di cose hardcodate che andranno trasformate in impostazioni nella finale
*/

function P3Desklet(metadata, desklet_id) {
    this._init(metadata, desklet_id);
}

P3Desklet.prototype = {
    __proto__: Desklet.Desklet.prototype,

    _init: function(metadata, desklet_id) {
        Desklet.Desklet.prototype._init.call(this, metadata, desklet_id);
    },

    on_desklet_added_to_desktop: function(userEnabled) {
        this.setupUI();
    },

    setupUI: function() {
        // main container for the desklet
        this._clock_actor = new St.Widget();
        this.setContent(this._clock_actor);


        // background image
        let bgName = "p3corner-wario-time.svg"
        let orig_width, orig_height, fileInfo;
        [fileInfo, orig_width, orig_height] = GdkPixbuf.Pixbuf.get_file_info(DESKLET_DIR + "/" + bgName);

        const CANON_HEIGHT = 387.0;
        const CANON_WIDTH = orig_width * CANON_HEIGHT / orig_height;

        let scale = 1;
        let scaledWidth = scale * CANON_WIDTH;
        let scaledHeight = scale * CANON_HEIGHT;

        let h_offset = 6;
        let v_offset = 0;
        this._clock_actor.set_style(
            "margin-left:" + h_offset + "px;" +
            "margin-top:" + v_offset + "px;"
        );
        
        let pixBuf = GdkPixbuf.Pixbuf.new_from_file_at_size(DESKLET_DIR + "/" + bgName, scaledWidth, scaledHeight);
        let image = new Clutter.Image();
        image.set_data(
            pixBuf.get_pixels(),
            pixBuf.get_has_alpha() ? Cogl.PixelFormat.RGBA_8888 : Cogl.PixelFormat.RGBA_888,
            scaledWidth, scaledHeight,
            pixBuf.get_rowstride()
        );
        
        this._bg_actor = new Clutter.Actor({width: scaledWidth, height: scaledHeight});
        this._bg_actor.set_content(image);
        this._bg_actor.set_pivot_point(0, 1);
        
        this._clock_actor.add_actor(this._bg_actor);


        // big text to show the time, either as HH:MM or in a broader sense (morning/afternoon/...)
        let time_text = "After School";
        this._time_label = new St.Label({style_class:"time-label", width: scaledWidth, height: scaledHeight});
        this._time_label.set_position(0, 0);
        this._time_label.set_text(time_text);
        this._time_label.set_style(
            "font-size: " + scale*70 + "px; " +
            "padding-top: " + scale*62 + "px; " +
            "padding-right: " + scale*31 + "px;"
        );
        // drop shadow
        this._time_shadow_label = new St.Label({style_class:"time-label", width: scaledWidth, height: scaledHeight});
        this._time_shadow_label.set_position(0, 0);
        this._time_shadow_label.set_text(time_text);
        this._time_shadow_label.set_style(
            "font-size: " + scale*70 + "px; " +
            "padding-top: " + scale*70 + "px; " +
            "padding-right: " + scale*23 + "px;" +
            "color: #447fab;"
        );

        // order is relevant: stuff added later comes up in front
        this._clock_actor.add_actor(this._time_shadow_label);
        this._clock_actor.add_actor(this._time_label);


        // TODO NEXT: label per la data (i.e. altre ore su google font) (magari il font finder ci funziona meglio con questo)
    }
}

function main(metadata, desklet_id) {
    return new P3Desklet(metadata, desklet_id);
}