const Settings = imports.ui.settings;
const Soup = imports.gi.Soup;

const UUID = "p3-clock@torchipeppo";
const DESKLET_DIR = imports.ui.deskletManager.deskletMeta[UUID].path;
imports.searchPath.push(DESKLET_DIR);
const CONSTANTS = imports.constants;

// REST API workflow based on https://github.com/linuxmint/cinnamon-spices-desklets/blob/master/bbcwx%2540oak-wood.co.uk/files/bbcwx%2540oak-wood.co.uk/3.0/desklet.js
let _httpSession;
if (Soup.MAJOR_VERSION === undefined || Soup.MAJOR_VERSION === 2) {
    _httpSession = new Soup.SessionAsync();
    Soup.Session.prototype.add_feature.call(_httpSession, new Soup.ProxyResolverDefault());
} else { //version 3
    _httpSession = new Soup.Session();
}

class WeatherAPISource {
    constructor(uuid, desklet_id) {
        this.reset_time_of_last_weather_update();

        this.settings = new Settings.DeskletSettings(this, uuid, desklet_id);

        this.settings.bind("wapi-enable", "wapi_enabled_switch", this._onWAPISettingsChanged);
        this.settings.bind("wapi-key", "wapi_key", this._onWAPISettingsChanged);
        this.settings.bind("wapi-query", "wapi_query", this._onWAPISettingsChanged);
        this.settings.bind("wapi-update-period-minutes", "wapi_update_period", this._onWAPISettingsChanged);

        this.settings.bind("bottom-emoji-type", "emoji_type", this._onWAPISettingsChanged);
        this.settings.bind("bottom-caption-type", "caption_type", this._onWAPISettingsChanged);
    }

    _onWAPISettingsChanged() {
        this.requestWAPIUpdate();
    }

    requestWAPIUpdate() {
        this.next_weather_update_is_fast = true;
    }

    reset_time_of_last_weather_update() {
        this.time_of_last_weather_update = new Date(0);  // epoch means "never updated before"
    }

    make_weatherAPI_request(back_reference, emoji_callback, label_callback) {
        let now = new Date();
        const NORMAL_WAIT_TIME = this.wapi_update_period*60*1000;  // from minutes to milliseconds
        const FAST_WAIT_TIME = 20*1000;  // very few seconds in milliseconds
        let cooldown = this.next_weather_update_is_fast ? FAST_WAIT_TIME : NORMAL_WAIT_TIME;
        if (now - this.time_of_last_weather_update > cooldown) {
            // global.log("YEEEEEEEEEEEEEEEEEAAAAAAH");
            this.time_of_last_weather_update = now;
            this.next_weather_update_is_fast = false;
            this._getWeather(
                "http://api.weatherapi.com/v1/forecast.json?key="+this.wapi_key+"&q="+this.wapi_query,
                (response) => {
                    if (response) {
                        let resp_json = JSON.parse(response);
                        emoji_callback.call(back_reference, this._make_emoji_text(resp_json));
                        label_callback.call(back_reference, this._make_label_text(resp_json));
                    }
                    else {
                        emoji_callback.call(back_reference, "⚠️");
                        label_callback.call(back_reference, "Error: see log\nSuper + L");
                    }
                }
            )
        }
    }

    _make_emoji_text(resp_json) {
        switch (this.emoji_type) {
            case "moon":
                let moon_phase_name = resp_json.forecast.forecastday[0].astro.moon_phase;
                return CONSTANTS.MOON_PHASES_BY_WEATHERAPI_NAME[moon_phase_name];
            case "weather":
                let weather_code = resp_json.current.condition.code;
                return CONSTANTS.WEATHER_EMOJIS_BY_CONDITION_CODE[weather_code];
            default:
                return "";
        }
    }

    _make_label_text(resp_json) {
        switch (this.caption_type) {
            case "moon":
                let moon_phase_name = resp_json.forecast.forecastday[0].astro.moon_phase;
                return moon_phase_name.replace(" ", "\n");
            case "weather":
                let weather_code = resp_json.current.condition.code;
                let weather_emoji = CONSTANTS.WEATHER_EMOJIS_BY_CONDITION_CODE[weather_code];
                return CONSTANTS.WEATHER_LABELS_BY_EMOJI[weather_emoji];
            default:
                return "";
        }
    }

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