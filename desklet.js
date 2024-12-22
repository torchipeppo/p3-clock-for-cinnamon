const Desklet = imports.ui.desklet;
const St = imports.gi.St;
const GdkPixbuf = imports.gi.GdkPixbuf;
const Clutter = imports.gi.Clutter;
const Cogl = imports.gi.Cogl;
const CinnamonDesktop = imports.gi.CinnamonDesktop;

const UUID = "p3-clock@torchipeppo";
const DESKLET_DIR = imports.ui.deskletManager.deskletMeta[UUID].path;

/*
    TODO
    - Ci sono un sacco di cose hardcodate che andranno trasformate in impostazioni nella finale
*/

function hour_to_p3time(hour) {
    if (0<=hour && hour<5) {
        return "Late Night";
    }
    else if (5<=hour && hour<7) {
        return "Early Morning";
    }
    else if (7<=hour && hour<10) {
        return "Morning";
    }
    else if (10<=hour && hour<15) {
        return "Daytime";
    }
    else if (15<=hour && hour<19) {
        return "Afternoon";
    }
    else if (19<=hour && hour<24) {
        return "Evening";
    }
}

class P3Desklet extends Desklet.Desklet {
    // constructor(metadata, desklet_id) {
    //     super(metadata, desklet_id);
    //     this._date = new St.Label({style_class: "time-label"});
    //     this._date.set_text("lol")
    //     this.setContent(this._date);
    //     this.setHeader(_("Clock"));

    //     this.wallclock = new CinnamonDesktop.WallClock();
    //     this.clock_notify_id = 0;
    // }

    // _clockNotify(obj, pspec, data) {
    //     this._updateClock();
    // }

    // on_desklet_added_to_desktop() {
    //     this.COUNTER = 0;

    //     if (this.clock_notify_id == 0) {
    //         this.clock_notify_id = this.wallclock.connect("notify::clock", () => this._clockNotify());
    //     }
    // }

    // on_desklet_removed() {  // ok
    //     if (this.clock_notify_id > 0) {
    //         this.wallclock.disconnect(this.clock_notify_id);
    //         this.clock_notify_id = 0;
    //     }
    // }

    // _updateClock() {
    //     this._date.set_text(this.COUNTER.toString());
    //     this.COUNTER++;
    //     global.log("BABYBABYBABYBABYBABYBABYBABYBABYBABYBABYBABYBABYBABYBABYBABYBABY")
    // }






















    constructor(metadata, desklet_id) {
        super(metadata, desklet_id);
        this.setupUI();
        this.wallclock = new CinnamonDesktop.WallClock();
        this.clock_notify_id = 0;
    }

    on_desklet_added_to_desktop(userEnabled) {
        this._updateClock();

        if (this.clock_notify_id == 0) {
            this.clock_notify_id = this.wallclock.connect("notify::clock", () => this._clockNotify());
        }
    }

    on_desklet_removed() {
        if (this.clock_notify_id > 0) {
            this.wallclock.disconnect(this.clock_notify_id);
            this.clock_notify_id = 0;
        }
    }

    _clockNotify(obj, pspec, data) {
        this._updateClock();
    }

    _updateClock() {
        global.log("BABYBABYBABYBABYBABYBABYBABYBABYBABYBABYBABYBABYBABYBABYBABYBABY");

        let p3time = hour_to_p3time(Number(this.wallclock.get_clock_for_format("%H")));
        this._time_label.set_text(p3time);
        this._time_shadow_label.set_text(p3time);

        let date_text = this.wallclock.get_clock_for_format("%m / %e");
        if (date_text[0] == "0") {
            date_text = date_text.substr(1);
        }
        this._date_label.set_text(date_text);

        this._weekday_label.set_text(this.wallclock.get_clock_for_format("%a"));
    }

    setupUI() {
        // main container for the desklet
        this._clock_actor = new St.Widget();
        this.setContent(this._clock_actor);
        // TODO this.setHeader


        // background image
        let bgName = "p3corner.svg"
        let orig_width, orig_height, fileInfo;
        [fileInfo, orig_width, orig_height] = GdkPixbuf.Pixbuf.get_file_info(DESKLET_DIR + "/" + bgName);

        const CANON_HEIGHT = 387.0;
        const CANON_WIDTH = orig_width * CANON_HEIGHT / orig_height;
        const MOON_PHASES = "🌕🌖🌗🌘🌑🌒🌓🌔";

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
        let time_text = "Unknown";
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


        let date_text = "?? / ??";
        this._date_label = new St.Label({style_class:"date-label", width: scaledWidth, height: scaledHeight});
        this._date_label.set_position(0, 0);
        this._date_label.set_text(date_text);
        this._date_label.set_style(
            "font-size: " + scale*52 + "px; " +
            "padding-top: " + scale*17 + "px; " +
            "padding-right: " + scale*140 + "px;"
        );
        let dot_text = ".";
        this._dot_label = new St.Label({style_class:"date-label", width: scaledWidth, height: scaledHeight});
        this._dot_label.set_position(scale*(-101), scale*(-23));  // necessary, can't be at 0,0 b/c it's an ordinary dot
        this._dot_label.set_text(dot_text);
        this._dot_label.set_style(
            "font-size: " + scale*81 + "px; "
        );
        let weekday_text = "???";  // TODO qua non seguiamo il gioco, ma lasciamo al locale (strftime %a)
        this._weekday_label = new St.Label({style_class:"weekday-label", width: scaledWidth, height: scaledHeight});
        this._weekday_label.set_position(0, 0);
        this._weekday_label.set_text(weekday_text);
        this._weekday_label.set_style(
            "font-size: " + scale*35 + "px; " +
            "padding-top: " + scale*28 + "px; " +
            "padding-left: " + scale*510 + "px;"
        );

        this._clock_actor.add_actor(this._date_label);
        this._clock_actor.add_actor(this._dot_label);
        this._clock_actor.add_actor(this._weekday_label);


        let next_text = "Next:";
        this._next_label = new St.Label({style_class:"next-label", width: scaledWidth, height: scaledHeight});
        this._next_label.set_position(0, 0);
        this._next_label.set_text(next_text);
        this._next_label.set_style(
            "font-size: " + scale*40 + "px; " +
            "padding-top: " + scale*150 + "px; " +
            "padding-right: " + scale*170 + "px;"
        );
        let countdown_text = "? ?";  // TODO per i giorni a cifra singola, mettere prefisso di 2 spazi
        this._countdown_label = new St.Label({style_class:"countdown-label", width: scaledWidth, height: scaledHeight});
        this._countdown_label.set_position(0, 0);
        this._countdown_label.set_text(countdown_text);
        this._countdown_label.set_style(
            "font-size: " + scale*51 + "px; " +
            "padding-top: " + scale*197 + "px; " +
            "padding-left: " + scale*170 + "px;"
        );
        let slash_text = "/";
        this._slash_label = new St.Label({style_class:"countdown-label", width: scaledWidth, height: scaledHeight});
        this._slash_label.set_position(0, 0);
        this._slash_label.set_text(slash_text);
        this._slash_label.set_style(
            "font-size: " + scale*51 + "px; " +
            "padding-top: " + scale*197 + "px; " +
            "padding-left: " + scale*310 + "px;"
        );
        let moon_text = "⚠️";
        this._moon_label = new St.Label({style_class:"moon-label", width: scaledWidth, height: scaledHeight});
        this._moon_label.set_position(0, 0);
        this._moon_label.set_text(moon_text);
        this._moon_label.set_style(
            "font-size: " + scale*70 + "px; " +
            "padding-top: " + scale*191 + "px; " +
            "padding-right: " + scale*15 + "px;"
        );
        let phase_text = "Full";
        this._phase_label = new St.Label({style_class:"phase-label", width: scaledWidth, height: scaledHeight});
        this._phase_label.set_position(0, 0);
        this._phase_label.set_text(phase_text);
        this._phase_label.set_style(
            "font-size: " + scale*46 + "px; " +
            "padding-top: " + scale*184 + "px; " +
            "padding-right: " + scale*124 + "px;"
        );

        if (false) {  // TODO dire tipo "if today is full moon, new moon, or half moon"
            this._clock_actor.add_actor(this._phase_label);
        }
        else {
            this._clock_actor.add_actor(this._next_label);
            this._clock_actor.add_actor(this._countdown_label);
            this._clock_actor.add_actor(this._slash_label);
            this._clock_actor.add_actor(this._moon_label);
        }
    }

    // TODO NEXT two parallel paths now: make this dynamic,
    //           and make this more useful / less P3 accurate
}

function main(metadata, desklet_id) {
    return new P3Desklet(metadata, desklet_id);
}