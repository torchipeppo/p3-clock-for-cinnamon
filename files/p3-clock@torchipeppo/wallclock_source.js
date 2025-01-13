// not quite as isolated a module as the other sources
// this is more of a coherence choice
// and a way to keep desklet.js from getting bloated (again)

const Settings = imports.ui.settings;

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

function _get_days_left(date_json_string) {
    let today = new Date();
    today.setHours(0);
    today.setMinutes(0);
    today.setSeconds(0);
    today.setMilliseconds(0);

    let countdown_target = JSON.parse(date_json_string)

    let target = new Date(
        countdown_target.y,
        countdown_target.m-1,
        countdown_target.d
    );

    return (target - today) / (1000 * 60 * 60 * 24);
}

class WallclockSource {
    constructor(uuid, desklet_id, wallclock) {
        // share a reference with the main desklet
        this.wallclock = wallclock;
        this.settings = new Settings.DeskletSettings(this, uuid, desklet_id);

        this.settings.bind("middle-format", "time_format", this._onFormatSettingsChanged);
        this.settings.bind("top-format", "date_format", this._onFormatSettingsChanged);

        this.settings.bind("custom-countdown-list", "countdown_list");
    }

    time_format_or_default() {
        return this.time_format || this.wallclock.get_default_time_format();
    }
    date_format_or_default() {
        return this.date_format || "%x";
    }

    get_time_text() {
        let p3time = hour_to_p3time(Number(this.wallclock.get_clock_for_format("%H")));
        let actual_time_format = this.time_format_or_default().replace(/(?<=(^|[^%])(%%)*)%!/g, p3time);
        let formatted_time = this.wallclock.get_clock_for_format(actual_time_format);
        if (!this.time_format) {
            // default stylistic choice: put a little space in the clock
            formatted_time = formatted_time.replace(/[:]/g, " : ");
            formatted_time = formatted_time.replace(/[.]/g, " . ");
        }
        return formatted_time;
    }

    get_date_text() {
        let p3time = hour_to_p3time(Number(this.wallclock.get_clock_for_format("%H")));
        let actual_date_format = this.date_format_or_default().replace(/(?<=(^|[^%])(%%)*)%!/g, p3time);
        let formatted_date = this.wallclock.get_clock_for_format(actual_date_format);
        if (!this.date_format) {
            // default stylistic choice: try to remove the year (w/o trying too hard)
            formatted_date = formatted_date.replace(/.?[0-9]{4}.?/, "");
            // default stylistic choice: put a little space in the date
            formatted_date = formatted_date.replace(/[/]/g, " / ");
            formatted_date = formatted_date.replace(/[-]/g, " - ");
        }
        return formatted_date;
    }

    get_custom_countdown_item_from_list(i) {
        let found = -1
        for (let item of this.countdown_list) {
            if (
                item.enabled &&
                (item.persistent || _get_days_left(item.date) >= 0)
            ) {
                found++;
                if (found == i) {
                    return item;
                }
            }
        }
        return undefined;
    }

    get_custom_countdown_text_from_list_item(item) {
        let days_left = _get_days_left(item.date)
        if (days_left == 0) {
            return "Today";
        }
        else {
            return days_left.toString();
        }
    }
}