const UUID = "p3-clock@torchipeppo";
const DESKLET_DIR = imports.ui.deskletManager.deskletMeta[UUID].path;
imports.searchPath.push(DESKLET_DIR);
const CONSTANTS = imports.constants;

function split_font_string(font_string) {
    let a = font_string.split(" ");
    let output = {};
    output.size = Number(a.pop());
    output.style = "normal";
    output.weight = 400;
    while (true) {
        let last = a[a.length-1].toLowerCase();
        let match;
        if (CONSTANTS.FONT_STYLES.includes(last)) {
            output.style = last;
            a.pop();
        }
        else if (CONSTANTS.FONT_WEIGHTS.includes(last)) {
            output.weight = CONSTANTS.FONT_WEIGHTS_TO_NUMERIC[last];
            a.pop();
        }
        else if (match=/weight=([0-9]+)/.exec(last)) {
            output.weight = Number(match[1]);
            a.pop();
        }
        else {
            break;
        }
    }
    output.family = a.join(" ");
    return output;
}

function get_style_string(scale, vpadding, hpadding, font_dict, color) {
    let vpadding_dir = "top";
    if (vpadding < 0) {
        vpadding_dir = "bottom";
        vpadding = -vpadding;
    }
    let hpadding_dir = "right";
    if (hpadding < 0) {
        hpadding_dir = "left";
        hpadding = -hpadding;
    }
    return  "font-family: " + font_dict.family + "; " +
            "font-size: " + scale*font_dict.size + "px; " +
            "font-weight: " + font_dict.weight + "; " +
            "font-style: " + font_dict.style + "; " +
            "padding-" + vpadding_dir + ": " + scale*vpadding + "px; " +
            "padding-" + hpadding_dir + ": " + scale*hpadding + "px; " +
            "color: " + color + ";";
}