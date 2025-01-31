const Desklet = imports.ui.desklet;
const Settings = imports.ui.settings;
const St = imports.gi.St;
const GdkPixbuf = imports.gi.GdkPixbuf;
const Clutter = imports.gi.Clutter;
const Cogl = imports.gi.Cogl;
const CinnamonDesktop = imports.gi.CinnamonDesktop;
const Util = imports.misc.util;

const UUID = "p3-clock@torchipeppo";
const DESKLET_DIR = imports.ui.deskletManager.deskletMeta[UUID].path;

// imports changed b/w Cinnamon 5 and Cinnamon 6: see the following example
// https://github.com/linuxmint/cinnamon-spices-desklets/blob/master/devTools%40scollins/files/devTools%40scollins/desklet.js#L26
let SU, WeatherAPISource, LunarCalendarSource, WallclockSource, ColorScheme, FileHandler, SunCalcSource, CONSTANTS;
if (typeof require !== 'undefined') {
    SU = require("./style_utils");
    WeatherAPISource = require("./weatherapi_source");
    LunarCalendarSource = require("./lunar_calendar_source");
    WallclockSource = require("./wallclock_source");
    ColorScheme = require("./color_scheme");
    FileHandler = require("./file_handler");
    SunCalcSource = require("./suncalc_source");
    CONSTANTS = require("./constants");
}
else {
    imports.searchPath.push(DESKLET_DIR);
    SU = imports.style_utils;
    WeatherAPISource = imports.weatherapi_source;
    LunarCalendarSource = imports.lunar_calendar_source;
    WallclockSource = imports.wallclock_source;
    ColorScheme = imports.color_scheme;
    FileHandler = imports.file_handler;
    SunCalcSource = imports.suncalc_source;
    CONSTANTS = imports.constants;
}

/*
    TODO
    - Passato un mese (quindi a febbraio) fare in modo che un errore nella chiamata
        all'API fallisca silenziosamente, così se ci disconnettiamo dalla rete o che so io
        non abbiamo un messaggio d'errore inutile a schermo
    - Anche fare diversi schemi di colore sarebbe carino
        Forse anche un altro verde
    - Fare un file importabile per ogni stile nello screenshot showcase, forse.
    - Icona
*/

const SOURCE_DISABLED = 0
const SOURCE_WEATHERAPI = 1
const SOURCE_LOCAL_LUNAR_CALENDAR = 2
const SOURCE_LOCAL_WALLCLOCK = 3
const SOURCE_SUNCALC = 4

const color_scheme_keys = [
    "custom_corner1_color",
    "custom_corner2_color",
    "custom_date_color",
    "custom_time_color",
    "custom_time_shadow_color",
    "custom_bottom_color",
];
const text_style_keys = [
    "time_font",
    "time_shadow_enabled",
    "time_shadow_offset",
    "date_font",
    "emoji_size",
    "caption_font",
];
const text_content_keys = [
    "time_format",
    "date_format",
    "date_weekday_enabled",
    "emoji_type",
    "caption_type",
    "show_secondary_countdowns",
];
const countdown_keys = [
    "countdown_list",
];

function _settings_key_to_color_scheme_key(settings_key) {
    return /^custom_([a-zA-Z0-9_]+?)_color$/.exec(settings_key)[1];
}


class P3Desklet extends Desklet.Desklet {
    constructor(metadata, desklet_id) {
        super(metadata, desklet_id);
        this.createUI();

        this.wallclock = new CinnamonDesktop.WallClock();
        this.clock_notify_id = 0;

        this.file_handler = new FileHandler.FileHandler(this.metadata["uuid"], desklet_id);
        this.wapi_source = new WeatherAPISource.WeatherAPISource(this.metadata["uuid"], desklet_id);
        this.luncal_source = new LunarCalendarSource.LunarCalendarSource(this.metadata["uuid"], desklet_id, this.file_handler);
        this.clock_source = new WallclockSource.WallclockSource(this.metadata["uuid"], desklet_id, this.wallclock, this.file_handler);
        this.suncalc_source = new SunCalcSource.SunCalcSource(this.metadata["uuid"], desklet_id);
        this.color_scheme = new ColorScheme.ColorScheme(this.metadata["uuid"], desklet_id, this.file_handler);

        if (this.luncal_source.local_lunar_calendar_exists()) {
            global.log("["+UUID+"] Local lunar calendar found, using high-precision data.")
        }
        else {
            global.log("["+UUID+"] Local lunar calendar NOT found, defaulting to suncalc.")
        }

        this.settings = new Settings.DeskletSettings(this, this.metadata["uuid"], desklet_id);

        this.settings.bind("global-h-offset", "h_offset", this._onUISettingsChanged);
        this.settings.bind("global-v-offset", "v_offset", this._onUISettingsChanged);
        this.settings.bind("global-scale", "scale", this._onUISettingsChanged);

        this.settings.bind("global-color-scheme", "color_scheme_name", this._onColorSettingsChanged);
        this.settings.bind("global-custom-corner1", "custom_corner1_color", this._onColorSettingsChanged);
        this.settings.bind("global-custom-corner2", "custom_corner2_color", this._onColorSettingsChanged);
        this.settings.bind("global-custom-date", "custom_date_color", this._onColorSettingsChanged);
        this.settings.bind("global-custom-time", "custom_time_color", this._onColorSettingsChanged);
        this.settings.bind("global-custom-time-shadow", "custom_time_shadow_color", this._onColorSettingsChanged);
        this.settings.bind("global-custom-bottom", "custom_bottom_color", this._onColorSettingsChanged);
        this.settings.bind("global-color-invert-bottom", "invert_bottom_colors", this._onColorSettingsChanged);

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
        this.settings.bind("bottom-show-secondary-countdowns", "show_secondary_countdowns", this._onUISettingsChanged);

        this.settings.bind("custom-countdown-list", "countdown_list", this._onSettingsChanged);

        this.settings.bind("load-colors", "loading_color_scheme_enabled");
        this.settings.bind("load-style", "loading_text_style_enabled");
        this.settings.bind("load-content", "loading_text_content_enabled");
        this.settings.bind("load-countdown-list", "loading_countdown_list_enabled");

        this.settings.bind("first-time", "first_time", this._updateClock);

        this._menu.addSettingsAction(_("Date and Time Settings"), "calendar");

        this._onColorSettingsChanged();
        this.updateUI();
    }

    emoji_source() {
        switch (this.emoji_type) {
            case "":
                return SOURCE_DISABLED;
            case "moon":
                let llce = this.luncal_source.local_lunar_calendar_exists();
                return llce ? SOURCE_LOCAL_LUNAR_CALENDAR : SOURCE_SUNCALC;
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
            case "cntdn-full":
                let llce = this.luncal_source.local_lunar_calendar_exists();
                return llce ? SOURCE_LOCAL_LUNAR_CALENDAR : SOURCE_SUNCALC;
            case "weather":
            case "rain":
            case "temp-c":
            case "temp-f":
                return SOURCE_WEATHERAPI;
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

    save_settings() {
        var subset = {colors: {}, style: {}, content: {}, countdown: {}};
        for (let key of color_scheme_keys) {
            let cs_key = _settings_key_to_color_scheme_key(key)
            subset.colors[key] = this.color_scheme[cs_key];
        }
        for (let key of text_style_keys) {
            subset.style[key] = this[key];
        }
        for (let key of text_content_keys) {
            subset.content[key] = this[key];
        }
        for (let key of countdown_keys) {
            subset.countdown[key] = this[key];
        }
        Util.spawn_async(['python3', `${this.metadata.path}/saveDialog.py`, JSON.stringify(subset)]);
    }

    load_settings() {
        Util.spawn_async(
            ['python3', `${this.metadata.path}/loadDialog.py`],
            (response) => {
                if (response) {  // empty response means sth went wrong
                    let to_load = JSON.parse(response);
                    if (this.loading_color_scheme_enabled) {
                        this.color_scheme_name = "the-custom";
                        this.invert_bottom_colors = false;
                        Object.assign(this, to_load.colors);
                        this._onColorSettingsChanged();
                    }
                    if (this.loading_text_style_enabled) {
                        Object.assign(this, to_load.style);
                        this._onUISettingsChanged();
                    }
                    if (this.loading_text_content_enabled) {
                        Object.assign(this, to_load.content);
                        this._onFormatSettingsChanged();
                        this._onUISettingsChanged();
                        this._onWAPISettingsChanged();
                    }
                    if (this.loading_countdown_list_enabled) {
                        Object.assign(this, to_load.countdown);
                        this._onSettingsChanged();
                    }
                }
            }
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
        this._updateClock();
    }

    _onSettingsChanged() {
        if (this.first_time) {
            this.first_time = false;
        }
        this._updateClock();
    }

    _onColorSettingsChanged() {
        let custom_scheme = {};
        // just "custom" would have looked too much like some reserved name
        if (this.color_scheme_name == "the-custom") {
            for (let key of color_scheme_keys) {
                let cs_key = _settings_key_to_color_scheme_key(key);
                custom_scheme[cs_key] = this[key];
            }
        }
        this.color_scheme.load_color_scheme(this.color_scheme_name, custom_scheme, this.invert_bottom_colors);
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
        else if (es == SOURCE_SUNCALC) {
            this._emoji_label.set_text(this.suncalc_source.get_emoji_text());
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

        if ((cs == SOURCE_LOCAL_LUNAR_CALENDAR && luncal_exists) || cs == SOURCE_SUNCALC) {
            let text;
            switch (cs) {
                case SOURCE_LOCAL_LUNAR_CALENDAR: text = this.luncal_source.get_label_text(); break;
                case SOURCE_SUNCALC: text = this.suncalc_source.get_label_text(); break;
            }
            if (this.caption_type == "moon") {
                this._caption_label.set_text(text);
            }
            else if (this.caption_type == "cntdn-full") {
                if (/[0-9 ]+/.test(text)) {  // normal countdown
                    this._countdown_label.set_text(text);
                    if (!this.emoji_type) {  // remove the slash if we don't have an emoji, it looks better
                        this._slash_label.set_text("");
                    }
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
            let countdown_item = this.clock_source.get_custom_countdown_item_from_list(0);
            if (countdown_item) {
                let text = this.clock_source.get_custom_countdown_text_from_list_item(countdown_item);
                text = SU.countdown_formatting(text);
                this._countdown_label.set_text(text);
                if (! /[0-9 -]+/.test(text)) {  // remove the slash when not displaying numbers (i.e. "Today")
                    this._slash_label.set_text("");
                }
                if (countdown_item.name) {
                    this._next_label.set_text(countdown_item.name + ":");
                }
                else {
                    this._next_label.set_text(_("Limit") + ":");
                }
            }
            else {
                this._next_label.set_text(_("None") + ":")
                this._countdown_label.set_text("--");
            }
            if (!this.emoji_type) {  // also remove the slash if we don't have an emoji, it looks better
                this._slash_label.set_text("");
            }
        }
        else if (cs != SOURCE_WEATHERAPI) {  // i.e. SOURCE_DISABLED or local source failed
            this._caption_label.set_text("");
            this._next_label.set_text("");
            this._countdown_label.set_text("");
            this._slash_label.set_text("");
        }

        // secondary countdowns
        // (this is the only current use of the secondary label, so no other checks for now)
        let secondary_text = ""
        if (this.show_secondary_countdowns) {
            for (let i of [0,1]) {
                if (this.caption_type == "cntdn-cstm") {
                    i += 1;
                }
                let countdown_item = this.clock_source.get_custom_countdown_item_from_list(i);
                if (countdown_item) {
                    let name_text = countdown_item.name ? countdown_item.name : _("Limit");
                    let number_text = this.clock_source.get_custom_countdown_text_from_list_item(countdown_item);
                    if (number_text.length < 2) {
                        number_text = "  " + number_text;
                    }
                    if (secondary_text.length > 0) {
                        secondary_text += "\n";
                    }
                    secondary_text += name_text + ": " + number_text;
                }
            }
        }
        // this OVERRIDES any other setting (which should be false by default at this point anyway)
        if (this.first_time) {
            secondary_text = _("Right-click\nto configure!");
        }
        this._secondary_caption_label.set_text(secondary_text);

        if (this.weatherapi_is_enabled()) {
            this.wapi_source.make_weatherAPI_request(
                this,
                (es == SOURCE_WEATHERAPI) ? this.set_emoji_text : (_)=>{},
                (cs == SOURCE_WEATHERAPI) ? this.set_caption_text : (_)=>{},
                (cs == SOURCE_WEATHERAPI) ? this.set_countdown_text : (_)=>{},
                (cs == SOURCE_WEATHERAPI) ? this.set_next_text : (_)=>{},
                (cs == SOURCE_WEATHERAPI) ? this.set_slash_text : (_)=>{},
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
    set_next_text(text) {
        this._next_label.set_text(text);
    }
    set_slash_text(text) {
        this._slash_label.set_text(text);
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

        this._time_label = new St.Label();
        this._time_shadow_label = new St.Label();
        // order is relevant: stuff added later comes up in front
        this._clock_actor.add_actor(this._time_shadow_label);
        this._clock_actor.add_actor(this._time_label);

        this._date_label = new St.Label();
        this._dot_label = new St.Label();
        this._weekday_label = new St.Label();
        this._clock_actor.add_actor(this._date_label);
        this._clock_actor.add_actor(this._dot_label);
        this._clock_actor.add_actor(this._weekday_label);

        this._emoji_label = new St.Label();
        this._caption_label = new St.Label();
        this._clock_actor.add_actor(this._emoji_label);
        this._clock_actor.add_actor(this._caption_label);

        this._next_label = new St.Label();
        this._countdown_label = new St.Label();
        this._slash_label = new St.Label();
        this._phase_label = new St.Label();
        this._secondary_caption_label = new St.Label();
        this._clock_actor.add_actor(this._next_label);
        this._clock_actor.add_actor(this._countdown_label);
        this._clock_actor.add_actor(this._slash_label);
        this._clock_actor.add_actor(this._phase_label);
        this._clock_actor.add_actor(this._secondary_caption_label);
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
        let dot_style = SU.split_font_string("serif Bold 82");
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
                "right",
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
                "right",
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
                "right",
                41-date_style.size*0.5,
                date_padding_right,
                date_style,
                this.color_scheme.date
            )
        );
        this._dot_label.set_width(scaledWidth);
        this._dot_label.set_height(scaledHeight);
        this._dot_label.set_position(this.scale*(-103), this.scale*(-20));  // necessary, can't be at 0,0 b/c it's an ordinary dot
        this._dot_label.set_text(this.date_weekday_enabled ? "." : "");
        this._dot_label.set_style(
            SU.get_style_string(
                this.scale,
                "right",
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
                "center",
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
                "center",
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
                "right",
                226-caption_style.size*1.25,
                124,
                caption_style,
                this.color_scheme.bottom
            )
        );

        this._next_label.set_width(scaledWidth);
        this._next_label.set_height(scaledHeight);
        this._next_label.set_position(0, 0);
        this._next_label.set_text(_("Next") + ":");
        this._next_label.set_style(
            SU.get_style_string(
                this.scale,
                "right",
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
                "center",
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
                "center",
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
                "right",
                208-phase_style.size*0.5,
                127,
                phase_style,
                this.color_scheme.bottom
            )
        );
        this._secondary_caption_label.set_width(scaledWidth);
        this._secondary_caption_label.set_height(scaledHeight);
        this._secondary_caption_label.set_position(0, 0);
        this._secondary_caption_label.set_style(
            SU.get_style_string(
                this.scale,
                "right",
                295-caption_style.size*0.5,
                124,
                caption_style,
                this.color_scheme.bottom
            )
        );
    }
}

function main(metadata, desklet_id) {
    return new P3Desklet(metadata, desklet_id);
}
