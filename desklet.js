const Desklet = imports.ui.desklet;
const Settings = imports.ui.settings;
const St = imports.gi.St;
const GdkPixbuf = imports.gi.GdkPixbuf;
const Clutter = imports.gi.Clutter;
const Cogl = imports.gi.Cogl;
const CinnamonDesktop = imports.gi.CinnamonDesktop;
const Soup = imports.gi.Soup;
const ByteArray = imports.byteArray;

const UUID = "p3-clock@torchipeppo";
const DESKLET_DIR = imports.ui.deskletManager.deskletMeta[UUID].path;

/*
    TODO
    - Ci sono un sacco di cose hardcodate che andranno trasformate in impostazioni nella finale
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
*/

// REST API workflow based on https://github.com/linuxmint/cinnamon-spices-desklets/blob/master/bbcwx%2540oak-wood.co.uk/files/bbcwx%2540oak-wood.co.uk/3.0/desklet.js
let _httpSession;
if (Soup.MAJOR_VERSION === undefined || Soup.MAJOR_VERSION === 2) {
    _httpSession = new Soup.SessionAsync();
    Soup.Session.prototype.add_feature.call(_httpSession, new Soup.ProxyResolverDefault());
} else { //version 3
    _httpSession = new Soup.Session();
}

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

const MOON_PHASES_BY_WEATHERAPI_NAME = {
    "New Moon": "🌑",
    "Waxing Crescent": "🌒",
    "First Quarter": "🌓",
    "Waxing Gibbous": "🌔",
    "Full Moon": "🌕",
    "Waning Gibbous": "🌖",
    "Last Quarter": "🌗",
    "Waning Crescent": "🌘",
}

class P3Desklet extends Desklet.Desklet {
    constructor(metadata, desklet_id) {
        super(metadata, desklet_id);
        this.setupUI();

        this.wallclock = new CinnamonDesktop.WallClock();
        this.clock_notify_id = 0;

        this.settings = new Settings.DeskletSettings(this, this.metadata["uuid"], desklet_id);
        this.settings.bind("middle-format", "time_format", this._onFormatSettingsChanged);
        this.settings.bind("wapi-key", "wapi_key", this._onWAPISettingsChanged);
        this.settings.bind("wapi-query", "wapi_query", this._onWAPISettingsChanged);

        this._menu.addSettingsAction(_("Date and Time Settings"), "calendar");
    }

    time_format_or_default() {
        return this.time_format || this.wallclock.get_default_time_format();
    }

    updateFormat() {
        // this.use_custom_time_format = !!this.time_format;
        let actual_time_format = this.time_format_or_default();
        // this regex accounts for %% escaping  https://stackoverflow.com/questions/6070275/regular-expression-match-only-non-repeated-occurrence-of-a-character
        if (/(^|[^%])(%%)*%[SLs]/.test(actual_time_format)) {
            this.wallclock.set_format_string("%S");
        }
        else {
            this.wallclock.set_format_string(null);
        }
    }

    requestWAPIUpdate() {
        this.next_weather_update_is_fast = true;
    }

    _onSettingsChanged() {
        this._updateClock();
    }

    _onFormatSettingsChanged() {
        this.updateFormat();
        this._onSettingsChanged();
    }

    _onWAPISettingsChanged() {
        this.requestWAPIUpdate();
        this._onSettingsChanged();
    }

    on_desklet_added_to_desktop(userEnabled) {
        this.time_of_last_weather_update = new Date(0);  // eopch means "never updated before"
        this.updateFormat();
        this.requestWAPIUpdate();
        this._onSettingsChanged();

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
        let actual_time_format = this.time_format_or_default().replace(/(^|[^%])(%%)*%!/g, p3time);
        let formatted_time = this.wallclock.get_clock_for_format(actual_time_format);
        this._time_label.set_text(formatted_time);
        this._time_shadow_label.set_text(formatted_time);

        let date_text = this.wallclock.get_clock_for_format("%-m / %e");
        this._date_label.set_text(date_text);

        this._weekday_label.set_text(this.wallclock.get_clock_for_format("%a"));

        if (this.wapi_key === "") {  // disable
            this._moon_label.set_text("");
            this._phase_label.set_text("");
        }
        else {
            let now = new Date();
            const ONE_HOUR_MS = 60*60*1000;  // 1 hour in milliseconds
            const FAST_WAIT_TIME = 20*1000;  // very few seconds in milliseconds
            let cooldown = this.next_weather_update_is_fast ? FAST_WAIT_TIME : ONE_HOUR_MS;
            if (now - this.time_of_last_weather_update > cooldown) {
                // global.log("YEEEEEEEEEEEEEEEEEAAAAAAH");
                this.time_of_last_weather_update = now;
                this.next_weather_update_is_fast = false;
                this._getWeather(
                    "http://api.weatherapi.com/v1/forecast.json?key="+this.wapi_key+"&q="+this.wapi_query,
                    (response) => {
                        if (response) {
                            let resp_json = JSON.parse(response);
                            let moon_phase_name = resp_json.forecast.forecastday[0].astro.moon_phase;
                            this._moon_label.set_text(MOON_PHASES_BY_WEATHERAPI_NAME[moon_phase_name]);
                            this._phase_label.set_text(moon_phase_name.replace(" ", "\n"));
                        }
                        else {
                            this._moon_label.set_text("⚠️");
                            this._phase_label.set_text("Error: see log\nSuper + L");
                        }
                    }
                )
            }
        }
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


        let moon_text = "⚠️";
        this._moon_label = new St.Label({style_class:"moon-label", width: scaledWidth, height: scaledHeight});
        this._moon_label.set_position(0, 0);
        this._moon_label.set_text(moon_text);
        this._moon_label.set_style(
            "font-size: " + scale*70 + "px; " +
            "padding-top: " + scale*191 + "px; " +
            "padding-right: " + scale*15 + "px;"
        );
        let phase_text = "";
        this._phase_label = new St.Label({style_class:"phase-label", width: scaledWidth, height: scaledHeight});
        this._phase_label.set_position(0, 0);
        this._phase_label.set_text(phase_text);
        this._phase_label.set_style(
            "font-size: " + scale*34 + "px; " +
            "padding-top: " + scale*184 + "px; " +
            "padding-right: " + scale*124 + "px;"
        );

        this._clock_actor.add_actor(this._phase_label);
        this._clock_actor.add_actor(this._moon_label);
    }

    // TODO NEXT two parallel paths now: make this dynamic,
    //           and make this more useful / less P3 accurate

    _getWeather(url, callback) {
        var here = this;
        let message = Soup.Message.new('GET', url);
        if (Soup.MAJOR_VERSION === undefined || Soup.MAJOR_VERSION === 2) {
            _httpSession.timeout = 10;
            _httpSession.idle_timeout = 10;
            _httpSession.queue_message(message, function (session, message) {
                if( message.status_code == 200) {
                    try {
                        callback.call(here,message.response_body.data.toString());
                    } catch(e) {
                        global.logError(e)
                        callback.call(here,false);
                    }
                } else {
                    global.logWarning("Error retrieving address " + url + ". Status: " + message.status_code + ": " + message.reason_phrase);
                    here.data.status.lasterror = message.status_code;
                    callback.call(here,false);
                }
            });
        } else { //version 3
            _httpSession.timeout = 10;
            _httpSession.idle_timeout = 10;
            _httpSession.send_and_read_async(message, Soup.MessagePriority.NORMAL, null, function (session, result) {
                if( message.get_status() === 200) {
                    try {
                        const bytes = _httpSession.send_and_read_finish(result);
                        callback.call(here,ByteArray.toString(bytes.get_data()));
                    } catch(e) {
                        global.logError(e)
                        callback.call(here,false);
                    }
                } else {
                    global.logWarning("Error retrieving address " + url + ". Status: " + message.get_status() + ": " + message.get_reason_phrase());
                    here.data.status.lasterror = message.get_status();
                    callback.call(here,false);
                }
            });
        }
    }
}

function main(metadata, desklet_id) {
    return new P3Desklet(metadata, desklet_id);
}