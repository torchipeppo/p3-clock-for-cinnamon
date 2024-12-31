const CAPTION_TYPE_SPECS = {
    "" : {
        caption_label: "",
        next_label: "",
        countdown_label: "",
        slash_label: "",
    },
    "weather" : {
        caption_label: "<get>",
        next_label: "",
        countdown_label: "",
        slash_label: "",
    },
    "moon" : {
        caption_label: "<get>",
        next_label: "",
        countdown_label: "",
        slash_label: "",
    },
    "cntdn-full" : {
        caption_label: "",
        next_label: "Next:",
        countdown_label: "<get>",
        slash_label: "/",
    },
    "cntdn-cstm" : {
        caption_label: "",
        next_label: "Limit:",
        countdown_label: "<get>",
        slash_label: "/",
    }
}

const FONT_WEIGHTS_TO_NUMERIC = {
    "thin": 100,
    "extralight": 200,
    "extra-light": 200,
    "light": 300,
    "regular": 400,
    "normal": 400,
    "medium": 500,
    "semibold": 600,
    "semi-bold": 600,
    "bold": 700,
    "extrabold": 800,
    "extra-bold": 800,
    "ultrabold": 800,
    "ultra-bold": 800,
    "black": 900,
    "heavy": 900
}
const FONT_WEIGHTS = Object.keys(FONT_WEIGHTS_TO_NUMERIC);
const FONT_STYLES = ["italic", "oblique"]

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

const MOON_PHASE_NAMES_BY_LUNCAL_RESULT = {
    "new": "New Moon",
    "new-fq": "Waxing Crescent",
    "fq": "First Quarter",
    "fq-full": "Waxing Gibbous",
    "full": "Full Moon",
    "full-lq": "Waning Gibbous",
    "lq": "Last Quarter",
    "lq-new": "Waning Crescent",
}

const MOON_PHASE_SHORTNAMES = {
    "new": "New",
    "fq": "Half",
    "full": "Full",
    "lq": "Half",
}

const WEATHER_EMOJIS_BY_CONDITION_CODE = {
    1000: "☀️",
    1003: "⛅",
    1006: "☁️",
    1009: "☁️",
    1030: "🌫️",
    1063: "🌦️",
    1066: "🌨️",
    1069: "🌨️",
    1072: "🌦️",
    1087: "⛈️",
    1114: "🌨️",
    1117: "🌨️",
    1135: "🌫️",
    1147: "🌫️",
    1150: "🌦️",
    1153: "🌦️",
    1168: "🌦️",
    1171: "🌦️",
    1180: "🌦️",
    1183: "🌧️",
    1186: "🌦️",
    1189: "🌧️",
    1192: "🌦️",
    1195: "🌧️",
    1198: "🌧️",
    1201: "🌧️",
    1204: "🌨️",
    1207: "🌨️",
    1210: "🌨️",
    1213: "🌨️",
    1216: "🌨️",
    1219: "🌨️",
    1222: "🌨️",
    1225: "🌨️",
    1237: "🌨️",
    1240: "🌧️",
    1243: "🌧️",
    1246: "🌧️",
    1249: "🌨️",
    1252: "🌨️",
    1255: "🌨️",
    1258: "🌨️",
    1261: "🌨️",
    1264: "🌨️",
    1273: "⛈️",
    1276: "⛈️",
    1279: "🌨️",
    1282: "🌨️",
}

// a very limited amount of descriptions, for the sake of the translations.
const WEATHER_LABELS_BY_EMOJI = {
    "☀️": "Clear",
    "⛅": "Cloudy",
    "☁️": "Cloudy",
    "🌫️": "Fog",
    "🌦️": "Rain",
    "🌧️": "Rain",
    "⛈️": "Storm",
    "🌨️": "Cold\nprecip.",  // "Cold precipitations", a catch-all term for snow, sleet, etc.
}