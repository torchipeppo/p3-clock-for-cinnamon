const Desklet = imports.ui.desklet;
const Settings = imports.ui.settings;
const St = imports.gi.St;
const GdkPixbuf = imports.gi.GdkPixbuf;
const Clutter = imports.gi.Clutter;
const Cogl = imports.gi.Cogl;
const CinnamonDesktop = imports.gi.CinnamonDesktop;
const ByteArray = imports.byteArray;

const UUID = "p3-clock@torchipeppo";
const DESKLET_DIR = imports.ui.deskletManager.deskletMeta[UUID].path;

imports.searchPath.push(DESKLET_DIR);
const SU = imports.style_utils;
const WeatherAPISource = imports.weatherapi_source;
const CONSTANTS = imports.constants;

/*
    This desklet ships with a default configuration intended to be the most
    generically useful to computer users, and with a basic default font
    that is expected to be available anywhere.
    P3 enthusiasts may follow the suggested configuration to recreate
    the original look and feel as closely as open-source fonts allow:

    - Global:
        Set the scale and global offset to your liking.
    - Top row:
        Font "Geist ExtraBold 52".
        Use the default format and enable weekday.
    - Middle row: 
        Font "Instrument Sans 70".
        Use the special format "%!".
        Enable drop shadow, with offset 8.
    - Bottom row:
        Get a WeatherAPI key and display the moon phases.
        For the caption, use "Onest Bold 34".
        "Geist" also works well, if you don't feel like downloading another font.

    "Geist", "Instrument Sans" and "Onest" are found on Google Fonts,
    licensed under the OFL.
*/

/*
    TODO
    - Passato un mese (quindi a febbraio) fare in modo che un errore nella chiamata
        all'API fallisca silenziosamente, così se ci disconnettiamo dalla rete o che so io
        non abbiamo un messaggio d'errore inutile a schermo
    - Il countdown della luna piena ce lo teniamo per il postgame.
        Richiederemo all'utente di avere un calendario lunare in un certo formato
        in una certa posizione, perché moon-api richiede una carta di credito
        per pagare l'overage.
        Tanto un tale calendario lunare va aggiornato solo una volta l'anno.
        (Anche meno, se ti porti avanti, ma non so se poi rischia di non essere accurato.)
        Possibile pagina dove recuperarlo: https://www.timeanddate.com/moon/phases/
        Recupera setup attori Clutter e classi CSS da questo commit:
        538a95a8325166306607c6ebbeefa5594e4f1e24
    - Fatto quello, e quindi una volta che abbiamo la struttura per la doppia label
        in bottom row, possiamo anche espandere la funzionalità per includere anche
        countdown a un giorno arbitrario e probabilità di pioggia
    - Anche fare diversi schemi di colore sarebbe carino
        Blu, rosa, verde, giallo e rosso sono d'obbligo
        Forse anche altri tipo viola, blu scuro, un altro verde, ...
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
    constructor(metadata, desklet_id) {
        super(metadata, desklet_id);
        this.createUI();

        this.wallclock = new CinnamonDesktop.WallClock();
        this.clock_notify_id = 0;

        this.wapi_source = new WeatherAPISource.WeatherAPISource(this.metadata["uuid"], desklet_id);

        this.settings = new Settings.DeskletSettings(this, this.metadata["uuid"], desklet_id);

        this.settings.bind("global-h-offset", "h_offset", this._onUISettingsChanged);
        this.settings.bind("global-v-offset", "v_offset", this._onUISettingsChanged);
        this.settings.bind("global-scale", "scale", this._onUISettingsChanged);

        this.settings.bind("middle-format", "time_format", this._onFormatSettingsChanged);
        this.settings.bind("middle-font", "time_font", this._onUISettingsChanged);
        this.settings.bind("middle-shadow", "time_shadow_enabled", this._onUISettingsChanged);
        this.settings.bind("middle-shadow-offset", "time_shadow_offset", this._onUISettingsChanged);

        this.settings.bind("top-format", "date_format", this._onFormatSettingsChanged);
        this.settings.bind("top-font", "date_font", this._onUISettingsChanged);
        this.settings.bind("top-weekday", "date_weekday_enabled", this._onUISettingsChanged);

        this.settings.bind("wapi-enable", "wapi_enabled_switch", this._onWAPISettingsChanged);
        this.settings.bind("wapi-key", "wapi_key", this._onWAPISettingsChanged);
        this.settings.bind("wapi-query", "wapi_query", this._onWAPISettingsChanged);
        this.settings.bind("wapi-update-period-minutes", "wapi_update_period", this._onWAPISettingsChanged);

        this.settings.bind("bottom-emoji-type", "emoji_type", this._onWAPISettingsChanged);
        this.settings.bind("bottom-emoji-size", "emoji_size", this._onUISettingsChanged);
        this.settings.bind("bottom-caption-type", "caption_type", this._onWAPISettingsChanged);
        this.settings.bind("bottom-caption-font", "caption_font", this._onUISettingsChanged);

        this._menu.addSettingsAction(_("Date and Time Settings"), "calendar");

        this.updateUI();
    }

    time_format_or_default() {
        return this.time_format || this.wallclock.get_default_time_format();
    }
    date_format_or_default() {
        return this.date_format || "%x";
    }
    weatherapi_is_enabled() {
        return this.wapi_enabled_switch && this.wapi_key && (this.emoji_type || this.caption_type);
    }

    updateFormat() {
        let actual_time_format = this.time_format_or_default();
        let actual_date_format = this.date_format_or_default();
        let combined_format = actual_time_format + " " + actual_date_format
        // this regex accounts for %% escaping  https://stackoverflow.com/questions/6070275/regular-expression-match-only-non-repeated-occurrence-of-a-character
        if (/(?<=(^|[^%])(%%)*)%[SLs]/.test(combined_format)) {
            this.wallclock.set_format_string("%S");
        }
        else {
            this.wallclock.set_format_string(null);
        }
    }

    fullUpdateRightNow() {
        this.wapi_source.reset_time_of_last_weather_update();
        this.updateFormat();
        this.wapi_source.requestWAPIUpdate();
        this._onSettingsChanged();
    }

    _onSettingsChanged() {
        this._updateClock();
    }

    _onUISettingsChanged() {
        this.updateUI();
        this._onSettingsChanged();
    }

    _onFormatSettingsChanged() {
        this.updateFormat();
        this._onSettingsChanged();
    }

    _onWAPISettingsChanged() {
        // weatherAPI-related stuff is in the WeatherAPISource
        this._onSettingsChanged();
    }

    on_desklet_added_to_desktop(userEnabled) {
        this.fullUpdateRightNow();

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
        // global.log("BABYBABYBABYBABYBABY");

        let p3time = hour_to_p3time(Number(this.wallclock.get_clock_for_format("%H")));
        let actual_time_format = this.time_format_or_default().replace(/(?<=(^|[^%])(%%)*)%!/g, p3time);
        let formatted_time = this.wallclock.get_clock_for_format(actual_time_format);
        if (!this.time_format) {
            // default stylistic choice: put a little space in the clock
            formatted_time = formatted_time.replace(/[:]/g, " : ");
            formatted_time = formatted_time.replace(/[.]/g, " . ");
        }
        this._time_label.set_text(formatted_time);
        this._time_shadow_label.set_text(this.time_shadow_enabled ? formatted_time : "");

        let actual_date_format = this.date_format_or_default().replace(/(?<=(^|[^%])(%%)*)%!/g, p3time);
        let formatted_date = this.wallclock.get_clock_for_format(actual_date_format);
        if (!this.date_format) {
            // default stylistic choice: try to remove the year (w/o trying too hard)
            formatted_date = formatted_date.replace(/.?[0-9]{4}.?/, "");
            // default stylistic choice: put a little space in the date
            formatted_date = formatted_date.replace(/[/]/g, " / ");
            formatted_date = formatted_date.replace(/[-]/g, " - ");
        }
        this._date_label.set_text(formatted_date);

        let weekday_text = "";
        if (this.date_weekday_enabled) {
            weekday_text = this.wallclock.get_clock_for_format("%a");
        }
        this._weekday_label.set_text(weekday_text);

        if (!this.weatherapi_is_enabled()) {
            this._emoji_label.set_text("");
            this._caption_label.set_text("");
        }
        else {
            this.wapi_source.make_weatherAPI_request(this, this.set_emoji_text, this.set_label_text);
        }
    }

    set_emoji_text(text) {
        this._emoji_label.set_text(text);
    }
    set_label_text(text) {
        this._caption_label.set_text(text);
    }

    createUI() {
        // main container for the desklet
        this._clock_actor = new St.Widget();
        this.setContent(this._clock_actor);
        this.setHeader(_("Moonlight Clock"));

        this._bg_image = new Clutter.Image();
        this._bg_actor = new Clutter.Actor();
        this._bg_actor.set_content(this._bg_image);  // this might wanna be in update if we ever do different color schenes, I dunno
        this._clock_actor.add_actor(this._bg_actor);

        this._time_label = new St.Label({style_class:"time-label"});
        this._time_shadow_label = new St.Label({style_class:"time-label"});
        // order is relevant: stuff added later comes up in front
        this._clock_actor.add_actor(this._time_shadow_label);
        this._clock_actor.add_actor(this._time_label);

        this._date_label = new St.Label({style_class:"date-label"});
        this._dot_label = new St.Label({style_class:"date-label"});
        this._weekday_label = new St.Label({style_class:"weekday-label"});
        this._clock_actor.add_actor(this._date_label);
        this._clock_actor.add_actor(this._dot_label);
        this._clock_actor.add_actor(this._weekday_label);

        this._emoji_label = new St.Label({style_class:"emoji-label"});
        this._caption_label = new St.Label({style_class:"caption-label"});
        this._clock_actor.add_actor(this._emoji_label);
        this._clock_actor.add_actor(this._caption_label);
    }

    updateUI() {
        this._clock_actor.set_style(
            "margin-left:" + this.h_offset + "px;" +
            "margin-top:" + this.v_offset + "px;"
        );


        // background image
        let bgName = "p3corner.svg"
        let orig_width, orig_height, fileInfo;
        [fileInfo, orig_width, orig_height] = GdkPixbuf.Pixbuf.get_file_info(DESKLET_DIR + "/" + bgName);

        const CANON_HEIGHT = 387.0;
        const CANON_WIDTH = orig_width * CANON_HEIGHT / orig_height;

        let scaledWidth = this.scale * CANON_WIDTH;
        let scaledHeight = this.scale * CANON_HEIGHT;


        let pixBuf = GdkPixbuf.Pixbuf.new_from_file_at_size(DESKLET_DIR + "/" + bgName, scaledWidth, scaledHeight);
        this._bg_image.set_data(
            pixBuf.get_pixels(),
            pixBuf.get_has_alpha() ? Cogl.PixelFormat.RGBA_8888 : Cogl.PixelFormat.RGBA_888,
            scaledWidth, scaledHeight,
            pixBuf.get_rowstride()
        );
        
        this._bg_actor.set_width(scaledWidth);
        this._bg_actor.set_height(scaledHeight);
        this._bg_actor.set_pivot_point(0, 1);


        let time_style = SU.split_font_string(this.time_font);
        let date_style = SU.split_font_string(this.date_font);
        let dot_style = SU.split_font_string("Ubuntu Bold 82");
        let weekday_style = SU.split_font_string(date_style.family + " 35");
        let emoji_style = SU.split_font_string("sans " + this.emoji_size);
        let caption_style = SU.split_font_string(this.caption_font);

        this._time_label.set_width(scaledWidth);
        this._time_label.set_height(scaledHeight);
        this._time_label.set_position(0, 0);
        this._time_label.set_style(
            SU.get_style_string(this.scale, 97-time_style.size*0.5, 31, time_style, "white")
        );
        this._time_shadow_label.set_width(scaledWidth);
        this._time_shadow_label.set_height(scaledHeight);
        this._time_shadow_label.set_position(0, 0);
        this._time_shadow_label.set_style(
            SU.get_style_string(this.scale, 97-time_style.size*0.5+this.time_shadow_offset, 31-this.time_shadow_offset, time_style, "#447fab")
        );


        this._date_label.set_width(scaledWidth);
        this._date_label.set_height(scaledHeight);
        this._date_label.set_position(0, 0);
        let date_padding_right = this.date_weekday_enabled ? 140 : 31;
        this._date_label.set_style(
            SU.get_style_string(this.scale, 41-date_style.size*0.5, date_padding_right, date_style, "#226182")
        );
        this._dot_label.set_width(scaledWidth);
        this._dot_label.set_height(scaledHeight);
        this._dot_label.set_position(this.scale*(-108), this.scale*(-20));  // necessary, can't be at 0,0 b/c it's an ordinary dot
        this._dot_label.set_text(this.date_weekday_enabled ? "." : "");
        this._dot_label.set_style(
            SU.get_style_string(this.scale, 0, 0, dot_style, "#226182")
        );
        this._weekday_label.set_width(scaledWidth);
        this._weekday_label.set_height(scaledHeight);
        this._weekday_label.set_position(0, 0);
        this._weekday_label.set_style(
            SU.get_style_string(this.scale, 27, -502, weekday_style, "#226182")
        );


        this._emoji_label.set_width(scaledWidth);
        this._emoji_label.set_height(scaledHeight);
        this._emoji_label.set_position(0, 0);
        this._emoji_label.set_style(
            SU.get_style_string(this.scale, 226-emoji_style.size*0.5, -496, emoji_style, "white")
        );
        this._caption_label.set_width(scaledWidth);
        this._caption_label.set_height(scaledHeight);
        this._caption_label.set_position(0, 0);
        this._caption_label.set_style(
            SU.get_style_string(this.scale, 226-caption_style.size*1.25, 124, caption_style, "aliceblue")
        );
    }
}

function main(metadata, desklet_id) {
    return new P3Desklet(metadata, desklet_id);
}