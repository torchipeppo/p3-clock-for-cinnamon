const Desklet = imports.ui.desklet;
const Settings = imports.ui.settings;
const St = imports.gi.St;
const GdkPixbuf = imports.gi.GdkPixbuf;
const Clutter = imports.gi.Clutter;
const Cogl = imports.gi.Cogl;
const CinnamonDesktop = imports.gi.CinnamonDesktop;

const UUID = "p3-clock@torchipeppo";
const DESKLET_DIR = imports.ui.deskletManager.deskletMeta[UUID].path;

// imports changed b/w Cinnamon 5 and Cinnamon 6: see the following example
// https://github.com/linuxmint/cinnamon-spices-desklets/blob/master/devTools%40scollins/files/devTools%40scollins/desklet.js#L26
let SU, WeatherAPISource, LunarCalendarSource, WallclockSource, ColorScheme, CONSTANTS;
if (typeof require !== 'undefined') {
    SU = require("./style_utils");
    WeatherAPISource = require("./weatherapi_source");
    LunarCalendarSource = require("./lunar_calendar_source");
    WallclockSource = require("./wallclock_source");
    ColorScheme = require("./color_scheme");
    CONSTANTS = require("./constants");
}
else {
    imports.searchPath.push(DESKLET_DIR);
    SU = imports.style_utils;
    WeatherAPISource = imports.weatherapi_source;
    LunarCalendarSource = imports.lunar_calendar_source;
    WallclockSource = imports.wallclock_source;
    ColorScheme = imports.color_scheme;
    CONSTANTS = imports.constants;
}

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
        Font "Instrument Sans Medium 70".
        Use the special format "%!".
        Enable drop shadow, with offset 8.
    - Bottom row:
        Get a WeatherAPI key and display the moon phases.
        For the caption, use "Onest Bold 50".
        "Geist" also works well, if you don't feel like downloading another font.

    "Geist", "Instrument Sans" and "Onest" are found on Google Fonts,
    licensed under the OFL.
*/

/*
    TODO
    - Passato un mese (quindi a febbraio) fare in modo che un errore nella chiamata
        all'API fallisca silenziosamente, così se ci disconnettiamo dalla rete o che so io
        non abbiamo un messaggio d'errore inutile a schermo
    - Mettere il calendario lunare da qualche parte in .local
        (o proprio nella diretory dell'applet), non direttamente in una
        sottocartella della home.
    - Cachare risposta weatherapi
    - Anche fare diversi schemi di colore sarebbe carino
        Blu, rosa, verde, giallo e rosso sono d'obbligo (fatti!)
        Forse anche altri tipo viola, blu scuro, un altro verde, grigio ...
        E ovviamente un'opzione "custom" che permette di selezionare ciascun colore manualmente!
*/

const SOURCE_DISABLED = 0
const SOURCE_WEATHERAPI = 1
const SOURCE_LOCAL_LUNAR_CALENDAR = 2
const SOURCE_LOCAL_WALLCLOCK = 3


class P3Desklet extends Desklet.Desklet {
    constructor(metadata, desklet_id) {
        super(metadata, desklet_id);
        this.createUI();

        this.wallclock = new CinnamonDesktop.WallClock();
        this.clock_notify_id = 0;

        this.wapi_source = new WeatherAPISource.WeatherAPISource(this.metadata["uuid"], desklet_id);
        this.luncal_source = new LunarCalendarSource.LunarCalendarSource(this.metadata["uuid"], desklet_id);
        this.clock_source = new WallclockSource.WallclockSource(this.metadata["uuid"], desklet_id, this.wallclock);
        this.color_scheme = new ColorScheme.ColorScheme(this.metadata["uuid"], desklet_id);

        this.settings = new Settings.DeskletSettings(this, this.metadata["uuid"], desklet_id);

        this.settings.bind("global-h-offset", "h_offset", this._onUISettingsChanged);
        this.settings.bind("global-v-offset", "v_offset", this._onUISettingsChanged);
        this.settings.bind("global-scale", "scale", this._onUISettingsChanged);
        this.settings.bind("global-color-scheme", "color_scheme_name", this._onColorSettingsChanged);

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

        this.settings.bind("custom-countdown-date-select", "countdown_target", this._onSettingsChanged);

        this._menu.addSettingsAction(_("Date and Time Settings"), "calendar");

        this.updateUI();
    }

    emoji_source() {
        switch (this.emoji_type) {
            case "":
                return SOURCE_DISABLED;
            case "moon":
                let llce = this.luncal_source.local_lunar_calendar_exists();
                return llce ? SOURCE_LOCAL_LUNAR_CALENDAR : SOURCE_WEATHERAPI;
            case "weather":
                return SOURCE_WEATHERAPI;
            default:
                global.logError("Unrecognized emoji_type :" + this.emoji_type);
        }
    }
    caption_source() {
        switch (this.caption_type) {
            case "":
                return SOURCE_DISABLED;
            case "moon":
                let llce = this.luncal_source.local_lunar_calendar_exists();
                return llce ? SOURCE_LOCAL_LUNAR_CALENDAR : SOURCE_WEATHERAPI;
            case "weather":
            case "rain":
            case "temp-c":
            case "temp-f":
                return SOURCE_WEATHERAPI;
            case "cntdn-full":
                return SOURCE_LOCAL_LUNAR_CALENDAR;
            case "cntdn-cstm":
                return SOURCE_LOCAL_WALLCLOCK;
            default:
                global.logError("Unrecognized caption_type :" + this.caption_type);
        }
    }
    weatherapi_is_enabled() {
        return  this.wapi_enabled_switch &&
                this.wapi_key && (
                    this.emoji_source() == SOURCE_WEATHERAPI ||
                    this.caption_source() == SOURCE_WEATHERAPI
                );
    }

    updateFormat() {
        let actual_time_format = this.clock_source.time_format_or_default();
        let actual_date_format = this.clock_source.date_format_or_default();
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

    _onColorSettingsChanged() {
        this.color_scheme.load_color_scheme();
        this._onUISettingsChanged();
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

        let formatted_time = this.clock_source.get_time_text();
        this._time_label.set_text(formatted_time);
        this._time_shadow_label.set_text(this.time_shadow_enabled ? formatted_time : "");

        let formatted_date = this.clock_source.get_date_text();
        this._date_label.set_text(formatted_date);

        let weekday_text = "";
        if (this.date_weekday_enabled) {
            weekday_text = this.wallclock.get_clock_for_format("%a");
        }
        this._weekday_label.set_text(weekday_text);

        // emoji and label in the SOURCE_WEATHERAPI case
        // are updated in the callback for _getWeather, not directly here,
        // because they need to wait for the response.
        let es = this.emoji_source();
        let cs = this.caption_source();
        let luncal_exists = this.luncal_source.local_lunar_calendar_exists();

        if (es == SOURCE_LOCAL_LUNAR_CALENDAR && luncal_exists) {
            this._emoji_label.set_text(this.luncal_source.get_emoji_text());
        }
        else if (es != SOURCE_WEATHERAPI) {  // i.e. SOURCE_DISABLED or local source failed
            this._emoji_label.set_text("");
        }
        
        // set labels that are constant (or empty) in this config
        if (CONSTANTS.CAPTION_TYPE_SPECS[this.caption_type].caption_label != "<get>") {
            this._caption_label.set_text(CONSTANTS.CAPTION_TYPE_SPECS[this.caption_type].caption_label);
        }
        if (CONSTANTS.CAPTION_TYPE_SPECS[this.caption_type].next_label != "<get>") {
            this._next_label.set_text(CONSTANTS.CAPTION_TYPE_SPECS[this.caption_type].next_label);
        }
        if (CONSTANTS.CAPTION_TYPE_SPECS[this.caption_type].countdown_label != "<get>") {
            this._countdown_label.set_text(CONSTANTS.CAPTION_TYPE_SPECS[this.caption_type].countdown_label);
        }
        if (CONSTANTS.CAPTION_TYPE_SPECS[this.caption_type].slash_label != "<get>") {
            this._slash_label.set_text(CONSTANTS.CAPTION_TYPE_SPECS[this.caption_type].slash_label);
        }
        this._phase_label.set_text("");

        if (cs == SOURCE_LOCAL_LUNAR_CALENDAR && luncal_exists) {
            let text = this.luncal_source.get_label_text();
            if (this.caption_type == "moon") {
                this._caption_label.set_text(text);
            }
            else if (this.caption_type == "cntdn-full") {
                if (/[0-9 ]+/.test(text)) {  // normal countdown
                    this._countdown_label.set_text(text);
                }
                else {  // special moon phase
                    this._next_label.set_text("");
                    this._countdown_label.set_text("");
                    this._slash_label.set_text("");
                    this._phase_label.set_text(text);
                }
            }
        }
        else if (cs == SOURCE_LOCAL_WALLCLOCK) {
            // there's only custom countdown at the moment, so no check
            let text = this.clock_source.get_custom_countdown_text();
            this._countdown_label.set_text(text);
            if (! /[0-9 -]+/.test(text)) {  // remove the slash when not displaying numbers (i.e. "Today")
                this._slash_label.set_text("");
            }
        }
        else if (cs != SOURCE_WEATHERAPI) {  // i.e. SOURCE_DISABLED or local source failed
            this._caption_label.set_text("");
            this._next_label.set_text("");
            this._countdown_label.set_text("");
            this._slash_label.set_text("");
        }

        if (this.weatherapi_is_enabled()) {
            this.wapi_source.make_weatherAPI_request(
                this,
                (es == SOURCE_WEATHERAPI) ? this.set_emoji_text : (_)=>{},
                (cs == SOURCE_WEATHERAPI) ? this.set_caption_text : (_)=>{},
                (cs == SOURCE_WEATHERAPI) ? this.set_countdown_text : (_)=>{},
            );
        }
    }

    set_emoji_text(text) {
        this._emoji_label.set_text(text);
    }
    set_caption_text(text) {
        this._caption_label.set_text(text);
    }
    set_countdown_text(text) {
        this._countdown_label.set_text(text);
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

        this._next_label = new St.Label({style_class:"next-label"});
        this._countdown_label = new St.Label({style_class:"countdown-label"});
        this._slash_label = new St.Label({style_class:"countdown-label"});
        this._phase_label = new St.Label({style_class:"phase-label"});
        this._clock_actor.add_actor(this._next_label);
        this._clock_actor.add_actor(this._countdown_label);
        this._clock_actor.add_actor(this._slash_label);
        this._clock_actor.add_actor(this._phase_label);
    }

    updateUI() {
        this._clock_actor.set_style(
            "margin-left:" + this.h_offset + "px;" +
            "margin-top:" + this.v_offset + "px;"
        );


        // background image
        let bgName = "p3corner-custom.svg"
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
        // There is a single bottom caption font,
        // but everyone has a different (but related) size
        let caption_style = SU.split_font_string(this.caption_font);
        caption_style.size *= 0.7;
        let next_style = SU.split_font_string(this.caption_font);
        next_style.size *= 0.8;
        let countdown_style = SU.split_font_string(this.caption_font);
        countdown_style.size *= 1.0;
        let phase_style = SU.split_font_string(this.caption_font);
        phase_style.size *= 0.9;

        this._time_label.set_width(scaledWidth);
        this._time_label.set_height(scaledHeight);
        this._time_label.set_position(0, 0);
        this._time_label.set_style(
            SU.get_style_string(
                this.scale,
                97-time_style.size*0.5,
                31,
                time_style,
                this.color_scheme.time
            )
        );
        this._time_shadow_label.set_width(scaledWidth);
        this._time_shadow_label.set_height(scaledHeight);
        this._time_shadow_label.set_position(0, 0);
        this._time_shadow_label.set_style(
            SU.get_style_string(
                this.scale,
                97-time_style.size*0.5+this.time_shadow_offset,
                31-this.time_shadow_offset,
                time_style,
                this.color_scheme.time_shadow
            )
        );


        this._date_label.set_width(scaledWidth);
        this._date_label.set_height(scaledHeight);
        this._date_label.set_position(0, 0);
        let date_padding_right = this.date_weekday_enabled ? 140 : 31;
        this._date_label.set_style(
            SU.get_style_string(
                this.scale,
                41-date_style.size*0.5,
                date_padding_right,
                date_style,
                this.color_scheme.date
            )
        );
        this._dot_label.set_width(scaledWidth);
        this._dot_label.set_height(scaledHeight);
        this._dot_label.set_position(this.scale*(-108), this.scale*(-20));  // necessary, can't be at 0,0 b/c it's an ordinary dot
        this._dot_label.set_text(this.date_weekday_enabled ? "." : "");
        this._dot_label.set_style(
            SU.get_style_string(
                this.scale,
                0,
                0,
                dot_style,
                this.color_scheme.date
            )
        );
        this._weekday_label.set_width(scaledWidth);
        this._weekday_label.set_height(scaledHeight);
        this._weekday_label.set_position(0, 0);
        this._weekday_label.set_style(
            SU.get_style_string(
                this.scale,
                27,
                -502,
                weekday_style,
                this.color_scheme.date
            )
        );


        this._emoji_label.set_width(scaledWidth);
        this._emoji_label.set_height(scaledHeight);
        this._emoji_label.set_position(0, 0);
        this._emoji_label.set_style(
            SU.get_style_string(
                this.scale,
                226-emoji_style.size*0.5,
                -496,
                emoji_style,
                "white"
            )
        );
        this._caption_label.set_width(scaledWidth);
        this._caption_label.set_height(scaledHeight);
        this._caption_label.set_position(0, 0);
        this._caption_label.set_style(
            SU.get_style_string(
                this.scale,
                226-caption_style.size*1.25,
                124,
                caption_style,
                this.color_scheme.bottom
            )
        );

        this._next_label.set_width(scaledWidth);
        this._next_label.set_height(scaledHeight);
        this._next_label.set_position(0, 0);
        this._next_label.set_text("Next:");
        this._next_label.set_style(
            SU.get_style_string(
                this.scale,
                169-next_style.size*0.5,
                170,
                next_style,
                this.color_scheme.bottom
            )
        );
        this._countdown_label.set_width(scaledWidth);
        this._countdown_label.set_height(scaledHeight);
        this._countdown_label.set_position(0, 0);
        this._countdown_label.set_style(
            SU.get_style_string(
                this.scale,
                223-countdown_style.size*0.5,
                -170,
                countdown_style,
                this.color_scheme.bottom
            )
        );
        this._slash_label.set_width(scaledWidth);
        this._slash_label.set_height(scaledHeight);
        this._slash_label.set_position(0, 0);
        this._slash_label.set_text("/");
        this._slash_label.set_style(
            SU.get_style_string(
                this.scale,
                223-countdown_style.size*0.5,
                -310,
                countdown_style,
                this.color_scheme.bottom
            )
        );
        this._phase_label.set_width(scaledWidth);
        this._phase_label.set_height(scaledHeight);
        this._phase_label.set_position(0, 0);
        this._phase_label.set_style(
            SU.get_style_string(
                this.scale,
                208-phase_style.size*0.5,
                127,
                phase_style,
                this.color_scheme.bottom
            )
        );
    }
}

function main(metadata, desklet_id) {
    return new P3Desklet(metadata, desklet_id);
}
