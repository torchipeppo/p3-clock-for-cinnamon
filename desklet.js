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
        let width, height, fileInfo;
        [fileInfo, width, height] = GdkPixbuf.Pixbuf.get_file_info(DESKLET_DIR + "/" + bgName);

        let scale = 400.0 / height;
        let scaledWidth = scale * width;
        let scaledHeight = scale * height;
        
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
        this._time_label = new St.Label({style_class:"time-label", width: scaledWidth, height: scaledHeight});
        this._time_label.set_position(0, 0);
        this._time_label.set_text("After School");
        // TODO NEXT: scalare testo insieme con la scale
        //            oppure... magari si riesce a renderizzarlo su raster https://stackoverflow.com/questions/24979367/how-to-render-text-on-a-gdkpixbuf-pixbuf
        //            ...ma questo vuol dire che poi con l'orologio vero devo rirenderizzare ogni minuto :(
        // TODO NEXT NEXT: drop shadow?

        this._clock_actor.add_actor(this._time_label);
    }
}

function main(metadata, desklet_id) {
    return new P3Desklet(metadata, desklet_id);
}