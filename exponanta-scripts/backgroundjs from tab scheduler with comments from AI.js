// Initial variable declarations and constants
var e = !1; // A flag variable
var t = ""; // An empty string variable
var a = !1; // Another flag variable
var s = ""; // Another empty string variable

// Extracting a specific substring from a string and converting it into an integer
let n = (o = (o = "AX153DR3").slice(3, -3), parseInt((r = o, String.fromCharCode(r)))); 
var r, o;

// URL and other constant definitions
const i = "https://tab-scheduler.extfy.com/", // Base URL for the extension
      _ = "_fxyz_s"; // Another constant

// Supported languages array
let l = [];
const c = ["ar", "am", "bg", "ca", "cs", "da", "de", "el", "en", "es", "et", "fa", "fi", "fil", "fr", "hr", "hu", "id", "it", "ja", "ko", "lt", "lv", "ms", "nl", "no", "pl", "pt_BR", "pt_PT", "ro", "ru", "sk", "sl", "sr", "sv", "sw", "th", "tr", "uk", "vi", "zh_CN", "zh_TW"]; 

// Timezone-related function extensions to Date prototype
let u = "_dstrdmp"; // Another constant

Date.prototype.stdTimezoneOffset = function() {
    var e = this.getFullYear();
    if (!Date.prototype.stdTimezoneOffset.cache.hasOwnProperty(e)) {
        for (var t = new Date(e, 0, 1).getTimezoneOffset(), a = [6, 7, 5, 8, 4, 9, 3, 10, 2, 11, 1], s = 0; s < 12; s++) {
            var n = new Date(e, a[s], 1).getTimezoneOffset();
            if (n != t) {
                t = Math.max(t, n);
                break;
            }
        }
        Date.prototype.stdTimezoneOffset.cache[e] = t;
    }
    return Date.prototype.stdTimezoneOffset.cache[e];
};
Date.prototype.stdTimezoneOffset.cache = {};

// Function to check if the current date is in DST (Daylight Saving Time)
Date.prototype.isDST = function() {
    return this.getTimezoneOffset() < this.stdTimezoneOffset();
};

// Current date instance
var d = new Date;

// Function to handle tab closing based on user settings
function m(e, t) {
    parseInt(t.close_pin_tabs || 0);
    parseInt(t.close_only_incognito_tab || 0);
    if (t?.close_pin_tabs && 1 === parseInt(t.close_pin_tabs) && 1 == e?.pinned) {
        // Do nothing if the pinned tab should not be closed
    } else {
        if (t?.close_only_incognito_tab && 1 === parseInt(t?.close_only_incognito_tab) && !1 === e?.incognito) return !1;
        chrome.tabs.remove(e.id);
        if (1 === parseInt(t.notification)) {
            var a = t.id + "_" + d.getTime();
            h(t.url_name, a, t.title, t.description, !1);
        }
    }
}

// Function to open a tab based on scheduled settings
function p(e, t, a) {
    var s = new Date(e.open_date + " " + e.open_time);
    n = (s.getDate() + "-" + (s.getMonth() + 1) + "-" + s.getFullYear() + " " + e.open_time).split(" ");
    r = n[1].split(":");
    o = (n[0].split("-"), new Date);
    i = new Date(o.getFullYear(), parseInt(o.getMonth()), o.getDate(), r[0], r[1]).setMilliseconds(o.getMilliseconds() + 700);
    
    // Check if specific timer settings are provided and handle them
    if ("" == e.custom_open_second && "custom_second" == e.timer_repeat || "" == e.custom_close_minute && "custom_minute" == e.timer_repeat) return;

    ["1_min", "5_min", "10_min", "30_min", "60_min", "custom_minute", "custom_second"].includes(e.timer_repeat) && (i = Date.now() + 500);
    var _ = !1;
    ["weekly", "none", "day", "year", "month"].includes(e.timer_repeat) && (_ = !0);
    let l = !1;
    if (e?.isExtraScheduled && (l = !0), !l && parseInt(o.getTime()) < parseInt(i) || "browser_open" == e.timer_repeat || _) {
        var c = "";
        urlPatern = "";
        var u = e.url_name;
        
        // Constructing the URL based on conditions
        if (u.match(/^(file|https?|ftp):\/\//) || (c = "https://", urlPatern = "*://*."), 1 == e.back_url_open) {
            (async function(e = "") {
                try {
                    const t = await fetch(e, { method: "GET", mode: "no-cors", cache: "no-cache", credentials: "same-origin", headers: { "Content-Type": "text/html" } });
                    return !!t.ok && await t.text();
                } catch (e) {
                    return !1;
                }
            })(c + u).then((e => {}));
        } else {
            // Handling tab opening logic
            var d = !1;
            if (1 == a && (d = !0), 0 == e?.open_in_incognito_mode) {
                const t = urlPatern + u + "/*", a = c + u;
                1 == e?.open_url_sametab ? chrome.tabs.query({ url: t }, (e => {
                    e.length > 0 ? (e.forEach((e => {
                        chrome.tabs.reload(e.id);
                    })), chrome.tabs.update(e[0].id, { active: !0 })) : f(a, d);
                })) : f(a, d);
            } else {
                chrome.windows.getAll({ populate: !1, windowTypes: ["normal"] }, (function(e) {
                    for (let t of e) if (t.incognito) return void chrome.tabs.create({ url: c + u, active: d, windowId: t.id });
                    chrome.windows.create({ url: c + u, focused: d, incognito: !0 });
                }));
            }
            if (1 === parseInt(e.notification)) {
                var m = e.id + "_" + o.getTime();
                h(u, m, e.title, e.description, !0);
            }
            "none" == e.timer_repeat && chrome.tabs.query({}, (function(e) {
                e.forEach(((e, t) => {
                    var a = e.url.split("/");
                    "tab_settings.html" == a[a.length - 1] && chrome.tabs.reload(e.id);
                }));
            }));
        }
    }
}

// Notification handling function
async function h(e, t, a, s, n) {
    var r = "";
    await async function() {
        let e = await chrome.storage.local.get(["user_language"]);
        if (e) {
            e.user_language = void 0 === e.user_language ? "en" : e.user_language;
            var t = await fetch(`../../_locales/${e.user_language}/messages.json`), a = await t.json();
            l = a;
        }
    }();
    "" != a && null != a && (r += "__MSG_title__: " + a + "\n"),
    "" != s && null != s && (r += "__MSG_description__: " + s + "\n");
    let o = "";
    o = n ? "__MSG_isOpen__" : "__MSG_isClose__";
    var i = { type: "basic", title: g("__MSG_appName__"), message: g(r + `__MSG_yourScheduleUrl__: ${e} ${o}`), iconUrl: "../images/icon48.png" };
    chrome.notifications.create("tab_" + t, i);
}

// Helper function to replace message placeholders with actual messages
function g(e) {
    return e.replace(/__MSG_(\w+)__/g, (function(e, t) {
        return t ? l[t].message : "";
    }));
}

// Create a new tab with the specified URL
function f(e, t) {
    chrome.tabs.create({ url: e, active: t });
}

// Function to process scheduled timer data
function w(e, t) {
    chrome.storage.local.get("scheduled_timer", (function(a) {
        a?.scheduled_timer && a?.scheduled_timer.forEach(((a, s) => {
            var n = a.url_name.replace(/(^\w+:|^)\/\//, ""), r = n.slice(-1);
            if (null != t && null != t?.url && ("both" === a?.schedule_type || "close" === a?.schedule_type)) {
                var o, i = t.url.replace(/(^\w+:|^)\/\//, ""), _ = new Date(a.close_date + " " + a.close_time), l = (_.getDate() + "-" + (_.getMonth() + 1) + "-" + _.getFullYear() + " " + a.close_time).split(" "), c = l[1].split(":"), u = l[0].split("-");
                if (o = new Date(u[2], parseInt(u[1], 10) - 1, u[0], c[0], c[1]), 1 == parseInt(a.close_url_filter) && 1 == parseInt(a.tab_status)) {
                    n = (n = (n = n.replace(/\*$/, "")).replace("www", "")).substring(1), i.indexOf(n) > -1 && 1 === parseInt(a.tab_status) && setTimeout((function() {
                        D("tabclose_" + a.id + "_" + t.id, (function(s) {
                            s || I(t.url, "tabclose_" + a.id + "_" + t.id, o, a.close_date, a.close_time, a.timer_repeat, e, t.title, a.show_timer, a.close_weekday, a.month, a.close_month_day, a.custom_close_minute, a.custom_close_second, a.every_hour_close_minute);
                        }));
                    }), 1e3);
                } else if (i.replace(/\/$/, "") == n.replace(/\/$/, "") && 1 === parseInt(a.tab_status)) {
                    setTimeout((function() {
                        D("tabclose_" + a.id + "_" + t.id, (function(s) {
                            s || I(t.url, "tabclose_" + a.id + "_" + t.id, o, a.close_date, a.close_time, a.timer_repeat, e, t.title, a.show_timer, a.close_weekday, a.month, a.close_month_day, a.custom_close_minute, a.custom_close_second, a.every_hour_close_minute);
                        }));
                    }), 1e3);
                }
                else if (n.startsWith("*") && "*" === r) {
                    n = (n = n.replace(/\*$/, "")).substring(1), i.indexOf(n) > -1 && 1 === parseInt(a.tab_status) && setTimeout((function() {
                        D("tabclose_" + a.id + "_" + t.id, (function(s) {
                            s || I(t.url, "tabclose_" + a.id + "_" + t.id, o, a.close_date, a.close_time, a.timer_repeat, e, t.title, a.show_timer, a.close_weekday, a.month, a.close_month_day, a.custom_close_minute, a.custom_close_second, a.every_hour_close_minute);
                        }));
                    }), 1e3);
                } else if (n.startsWith("*")) {
                    i = i.replace(/\/$/, ""), n = n.replace(/\/$/, ""), i.substr(i.length - (n.length - 1)).replace(/\/$/, "") === n.substr(n.length - (n.length - 1)) && 1 === parseInt(a.tab_status) && setTimeout((function() {
                        D("tabclose_" + a.id + "_" + t.id, (function(s) {
                            s || I(t.url, "tabclose_" + a.id + "_" + t.id, o, a.close_date, a.close_time, a.timer_repeat, e, t.title, a.show_timer, a.close_weekday, a.month, a.close_month_day, a.custom_close_minute, a.custom_close_second, a.every_hour_close_minute);
                        }));
                    }), 1e3);
                } else if ("*" === r) {
                    n = (n = n.replace(/\*$/, "")).replace(/\/$/, ""), i.slice(0, n.length).replace(/\/$/, "") === n && 1 === parseInt(a.tab_status) && setTimeout((function() {
                        D("tabclose_" + a.id + "_" + t.id, (function(s) {
                            s || I(t.url, "tabclose_" + a.id + "_" + t.id, o, a.close_date, a.close_time, a.timer_repeat, e, t.title, a.show_timer, a.close_weekday, a.month, a.close_month_day, a.custom_close_minute, a.custom_close_second, a.every_hour_close_minute);
                        }));
                    }), 1e3);
                }
            }
        }));
    }));
}

// Function to keep track of alarms and manage power mode
function y() {
    chrome.alarms.getAll((e => {
        let t = [];
        0 != e.length && (t = e.filter((e => {
            if ("userAuthe" !== e.name) return e;
        })), chrome.storage.local.get("power_mode", (function(e) {
            e?.power_mode ? 0 == t.length ? chrome.power.releaseKeepAwake() : chrome.power.requestKeepAwake("display") : chrome.power.releaseKeepAwake();
        })));
    }));
}

// Function to handle POST requests
async function b(e = "", t = {}) {
    return (await fetch(e, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(t) })).json();
}

// Function to process scheduled timer data
function v() {
    chrome.storage.local.get("scheduled_timer", (function(e) {
        if (e.scheduled_timer) {
            new Array;
            e.scheduled_timer.forEach(((e, t) => {
                chrome.alarms.getAll((function(t) {
                    let a = !1;
                    e?.isExtraScheduled && (a = !0), a || "both" !== e?.schedule_type && "open" !== e?.schedule_type || function(e, t, a, s, n, r, o, i, _, l, c = 0) {
                        var u, d = new Date(t + " " + a), m = (d.getDate() + "-" + (d.getMonth() + 1) + "-" + d.getFullYear() + " " + a).split(" "), p = m[1].split(":"), h = m[0].split("-");
                        u = new Date(h[2], parseInt(h[1], 10) - 1, h[0], p[0], p[1]);
                        var g = new Date, f = g.getFullYear() + "-" + ("0" + (g.getMonth() + 1)).slice(-2) + "-" + ("0" + g.getDate()).slice(-2), w = g.getTime(); 
                        g.getMonth();
                        if (1 === parseInt(n)) if ("none" === s) (t > f || t == f && d.getTime() > w) && S("opentab_" + e + "_" + s, { when: u.getTime() });
                        else if ("1_min" === s) S("opentab_" + e + "_" + s, { periodInMinutes: 1 });
                        else if ("5_min" === s) S("opentab_" + e + "_" + s, { periodInMinutes: 5 });
                        else if ("10_min" === s) S("opentab_" + e + "_" + s, { periodInMinutes: 10 });
                        else if ("30_min" === s) S("opentab_" + e + "_" + s, { periodInMinutes: 30 });
                        else if ("60_min" === s) {
                            let t = c || 0;
                            var y = new Date(parseInt(g.getFullYear()), parseInt(g.getMonth()), g.getDate(), g.getHours(), t);
                            if (y > g.getTime()) var b = y;
                            else if (y < g.getTime()) b = new Date(parseInt(g.getFullYear()), parseInt(g.getMonth()), g.getDate(), g.getHours() + 1, t);
                            S("opentab_" + e + "_" + s, { when: b.getTime(), periodInMinutes: 60 });
                        } else if ("day" === s) {
                            var v = new Date(parseInt(g.getFullYear()), parseInt(g.getMonth()), g.getDate(), p[0], p[1]);
                            if (parseInt(v.getTime()) > g.getTime()) S("opentab_" + e + "_" + s, { when: v.getTime(), periodInMinutes: 1440 });
                            else if (parseInt(v.getTime()) < g.getTime()) {
                                b = new Date(parseInt(g.getFullYear()), parseInt(g.getMonth()), g.getDate(), p[0], p[1]);
                                var I = 864e5;
                                S("opentab_" + e + "_" + s, { when: b.getTime() + I, periodInMinutes: 1440 });
                            }
                        } else if ("month" === s) {
                            b = new Date(parseInt(g.getFullYear()), parseInt(g.getMonth()), g.getDate(), p[0], p[1]);
                            i == g.getDate() && b.getTime() > w ? S("opentab_" + e + "_" + s, { when: b.getTime() }) : i == g.getDate() && b.getTime() < w || i < g.getDate() ? (b = new Date(parseInt(g.getFullYear()), parseInt(g.getMonth() + 1), parseInt(i), p[0], p[1]), S("opentab_" + e + "_" + s, { when: b.getTime() })) : i > g.getDate() ? (b = new Date(parseInt(g.getFullYear()), parseInt(g.getMonth()), parseInt(i), p[0], p[1]), S("opentab_" + e + "_" + s, { when: b.getTime() })) : chrome.alarms.clear("opentab_" + e + "_" + s);
                        } else if ("year" === s) {
                            var D = new Date(parseInt(g.getFullYear()), parseInt(h[1], 10) - 1, h[0], p[0], p[1]);
                            if (d.getTime() > w) S("opentab_" + e + "_" + s, { when: D.getTime() });
                            else if (d.getTime() < w) {
                                var T = g.getMonth();
                                11 === g.getMonth() && (T = 11);
                                b = new Date(g.getFullYear() + 1, T, h[0], p[0], p[1]);
                                S("opentab_" + e + "_" + s, { when: b.getTime() });
                            }
                        } else if ("weekly" === s && r && r.week_list.length > 0) {
                            var k = parseInt(10080);
                            r.week_list.forEach(((t, a) => {
                                var n = t.split("_")[0];
                                7 == n && (n = 0);
                                var r = new Date(parseInt(g.getFullYear()), parseInt(g.getMonth()), g.getDate(), p[0], p[1]);
                                if (parseInt(g.getDay()) == n && g.getTime() < r.getTime()) S("opentab_" + e + "_" + s + "_" + parseInt(t.split("_")[0]), { when: r.getTime(), periodInMinutes: k });
                                else {
                                    r = new Date(parseInt(g.getFullYear()), parseInt(g.getMonth()), g.getDate(), p[0], p[1]);
                                    var o = parseInt(r.getDate() + (parseInt(t.split("_")[0]) - 1 - r.getDay() + 7) % 7 + 1);
                                    r.setDate(o), S("opentab_" + e + "_" + s + "_" + t.split("_")[0], { when: r.getTime(), periodInMinutes: k });
                                }
                            }));
                        } else "custom_minute" === s && _ && "" !== _ ? S("opentab_" + e + "_" + s, { periodInMinutes: parseInt(_) }) : "custom_second" === s && l && "" !== l && S("opentab_" + e + "_" + s, { periodInMinutes: parseInt(l) / 60 });
                    } else {
                        chrome.alarms.clear("opentab_" + e + "_" + s);
                    }
                })(e.id, e.open_date, e.open_time, e.timer_repeat, e.tab_status, e.open_weekday, parseInt(e.month), parseInt(e.open_month_day), e.custom_open_minute, e.custom_open_second, e.every_hour_open_minute);
            }));
        }
    }));
}

// Function to create alarms for opening/closing tabs
function I(e, t, a, s, n, r, o, i, _, l, c, u, d, m, p) {
    var h, g = new Date, f = new Date(s + " " + n), w = (f.getDate() + "-" + (f.getMonth() + 1) + "-" + f.getFullYear() + " " + n).split(" "), y = w[1].split(":"), b = w[0].split("-");
    h = new Date(b[2], parseInt(b[1], 10) - 1, b[0], y[0], y[1]);
    var v = g.getFullYear() + "-" + ("0" + (g.getMonth() + 1)).slice(-2) + "-" + ("0" + g.getDate()).slice(-2), I = g.getTime(), D = new Date(parseInt(g.getFullYear()), parseInt(g.getMonth()), g.getDate(), y[0], y[1]);
    
    if ("none" == r) s === v && f.getTime() > I && S(t, { when: a.getTime() });
    else if ("1_min" === r) setTimeout((function() {
        S(t, { delayInMinutes: 1 });
    }), 500);
    else if ("5_min" === r) setTimeout((function() {
        S(t, { delayInMinutes: 5 });
    }), 500);
    else if ("10_min" === r) setTimeout((function() {
        S(t, { delayInMinutes: 10 });
    }), 500);
    else if ("30_min" === r) setTimeout((function() {
        S(t, { delayInMinutes: 30 });
    }), 500);
    else if ("60_min" === r) setTimeout((function() {
        let e = p || 0;
        var a = new Date(parseInt(g.getFullYear()), parseInt(g.getMonth()), g.getDate(), g.getHours(), e);
        if (a > g.getTime()) var s = a;
        else if (a < g.getTime()) s = new Date(parseInt(g.getFullYear()), parseInt(g.getMonth()), g.getDate(), g.getHours() + 1, e);
        S(t, { when: s.getTime() });
    }), 500);
    else if ("day" === r) {
        if (parseInt(D.getTime()) > I) S(t, { when: D.getTime(), periodInMinutes: 1440 });
        else if (parseInt(D.getTime()) < I) S(t, { when: D.getTime() + 864e5, periodInMinutes: 1440 });
    } else if ("weekly" === r && l && l.week_list.length > 0) {
        var T = parseInt(10080);
        l.week_list.forEach(((e, a) => {
            var s = e.split("_")[0];
            7 == s && (s = 0);
            var n = new Date(parseInt(g.getFullYear()), parseInt(g.getMonth()), g.getDate(), y[0], y[1]);
            if (parseInt(g.getDay()) === parseInt(s) && parseInt(n.getTime()) > I) S(t + "_" + e.split("_")[0], { when: n.getTime(), periodInMinutes: T });
            else {
                var r = parseInt(n.getDate() + (parseInt(e.split("_")[0]) - 1 - n.getDay() + 7) % 7 + 1);
                n.setDate(r), S(t + "_" + e.split("_")[0], { when: n.getTime(), periodInMinutes: T });
            }
        }));
    } else if ("year" === r) f.getTime() > I && S(t, { when: h.getTime() });
    else if ("month" === r) {
        D = new Date(parseInt(g.getFullYear()), parseInt(g.getMonth()), g.getDate(), y[0], y[1]);
        u == g.getDate() && D.getTime() > I ? S(t, { when: D.getTime() }) : u < g.getDate() ? (D = new Date(parseInt(g.getFullYear()), parseInt(g.getMonth() + 1), parseInt(u), y[0], y[1]), S(t, { when: D.getTime() })) : u > g.getDate() && (D = new Date(parseInt(g.getFullYear()), parseInt(g.getMonth()), parseInt(u), y[0], y[1]), S(t, { when: D.getTime() }));
    } else "custom_minute" === r && d && "" !== d ? setTimeout((function() {
        S(t, { delayInMinutes: parseInt(d) });
    }), 500) : "custom_second" === r && m && "" !== m && setTimeout((function() {
        S(t, { delayInMinutes: parseInt(m) / 60 });
    }), 500);
}

// Function to check if an alarm exists
function D(e, t) {
    chrome.alarms.get(e, (function(e) {
        t(!!e);
    }));
}

// Function to generate a unique identifier
function T() {
    var e = (new Date).getTime(), t = "undefined" != typeof performance && performance.now && 1e3 * performance.now() || 0;
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (function(a) {
        var s = 16 * Math.random();
        return e > 0 ? (s = (e + s) % 16 | 0, e = Math.floor(e / 16)) : (s = (t + s) % 16 | 0, t = Math.floor(t / 16)), ("x" === a ? s : 3 & s | 8).toString(16);
    }));
}

// Function to create a new alarm
function S(e, t) {
    try {
        chrome.alarms.create(e, t);
    } catch (e) {
        console.warn(e);
    }
}

// Function to perform scheduled data synchronization
async function k() {
    var r = "";
    await chrome.storage.local.get(["plan_info", "is_login", "scheduled_timer", "user_data_Set", "user_type", "_drtf_m", "user_licence_key", u], (async function(o) {
        void 0 !== o[u] && null !== o[u] && "" !== o[u] && $(o[u], u);
        try {
            chrome.cookies.get({ url: i, name: "user_login" }).then((async _ => {
                _ && "user_login" === _.name && "" !== _.value ? (r = "free", await chrome.cookies.get({ url: i, name: "_drtf_m" }).then((e => {
                    e && "_drtf_m" === e.name && (chrome.storage.local.set({ _drtf_m: e.value }), o._drtf_m = e.value);
                })), await chrome.cookies.get({ url: i, name: "user_plan" }).then((async _ => {
                    if (_ && "user_plan" === _.name && _.value) {
                        if (l = _.value, c = l.replace(/-/g, "+").replace(/_/g, "/"), u = decodeURIComponent(atob(c).split("").map((function(e) {
                            return "%" + ("00" + e.charCodeAt(0).toString(16)).slice(-2);
                        })).join("")), t = JSON.parse(u), !1 === e && (s = ""), o.is_login = !0, e = !0, o.plan_info = t, !0 === o.is_login && 0 == a) {
                            a = !0, !o.scheduled_timer || 0 == o.scheduled_timer || 0 != o.user_data_Set && null != o.user_data_Set ? 0 != o.user_data_Set && "new_login" != o.user_data_Set || await b(i + "api/schedule/userDataSync", { action: "user_sync", user_type: o.user_type, _drtf_m: o._drtf_m }).then((async e => {
                                1 == e.status && await chrome.storage.local.set({ user_data_Set: !0 });
                            })).catch((e => {})) : await F(o.scheduled_timer, o.user_type, o._drtf_m, "schedule_local");
                            let e = await async function() {
                                try {
                                    const e = await b(i + "api/schedule/getSchedule", { action: "getAllScheduleData" }), t = e.scheduleData;
                                    return t && 0 !== t.length ? (await chrome.storage.local.set({ scheduled_timer: t }), await chrome.alarms.clearAll((async function(e) {
                                        v(), (await chrome.tabs.query({})).forEach((e => {
                                            e?.url && e?.id && w(e.id, e);
                                        })), S("userAuthe", { delayInMinutes: 60, periodInMinutes: 60 });
                                    })), { success: !0, message: "Schedule data processed successfully", scheduled_timer: t }) : 1 == e.status && "" == t ? (await chrome.storage.local.set({ scheduled_timer: t }), await chrome.alarms.clearAll((async function(e) {
                                        S("userAuthe", { delayInMinutes: 60, periodInMinutes: 60 });
                                    })), { success: !0, message: "Schedule data processed successfully", scheduled_timer: t }) : { success: !1, message: "No schedule data found", scheduled_timer: [] };
                                } catch (e) {
                                    return { success: !1, message: "Error processing schedule data", error: e };
                                }
                            }();
                            e?.success && e?.scheduled_timer && (o.scheduled_timer = e.scheduled_timer), await async function(e, t) {
                                await b(i + "api/schedule/getUserSettings", { action: "getUserSetting", user_type: e, _drtf_m: t }).then((e => {
                                    const { auto_focus_tb: t = 0, dark_mode_tb: s = 0, power_mode_tb: n = 0, inactive_all_tab: r = 1 } = JSON.parse(e.userSettingData);
                                    chrome.storage.local.set({ auto_focus: t, dark_mode_tb: s, power_mode: n, inactive_all_tab: r, user_type: e.user_type }), 0 == e.user_data_Set && chrome.storage.local.set({ user_data_Set: "new_login" }, (function() {
                                        a = !1;
                                    }));
                                })).catch((e => {}));
                            }(o.user_type, o._drtf_m);
                            await chrome.storage.local.set({ plan_info: t, is_login: !0 }), t?.schedule_limit && (n = t.schedule_limit), o?.scheduled_timer && o.scheduled_timer, E(o._drtf_m) || t?.plan_type && "free" != t?.plan_type || (r = "free"), E(o._drtf_m) && (r = "free_trial"), t && "free" !== t?.plan_type && (r = "paid"), t?.plan_type && "free" != t?.plan_type || (E(o._drtf_m) || r === s) && (s = "free", o.scheduled_timer && await M(o.scheduled_timer)), t?.plan_type && "free" != t?.plan_type && r !== s && (s = "paid", o.scheduled_timer && await x(o.scheduled_timer)), o._drtf_m && E(o._drtf_m) && r !== s && (s = "free_trial", o.scheduled_timer && await x(o.scheduled_timer));
                        } else e && (s = ""), e = !1, o._drtf_m && !E(o._drtf_m) ? r = "free" : E(o._drtf_m) && (r = "free_trial"), o._drtf_m && !E(o._drtf_m) && r !== s ? (s = "free", o.scheduled_timer && await M(o.scheduled_timer)) : E(o._drtf_m) && r !== s && (s = "free_trial", o.scheduled_timer && await x(o.scheduled_timer)), a = !1, chrome.storage.local.remove(["plan_info", "is_login"]);
                        var l, c, u;
                    } else e && (s = ""), e = !1, o[u] && "" !== o[u] ? r = "paid" : !o._drtf_m || E(o._drtf_m) || o[u] ? o?._drtf_m && E(o._drtf_m) ? r = "free_trial" : o._drtf_m || o[u] || (r = "free") : r = "free", o[u] && "" !== o[u] && r !== s ? (s = "paid", o.scheduled_timer && await x(o.scheduled_timer)) : !o._drtf_m || E(o._drtf_m) || r === s || o[u] ? o?._drtf_m && E(o._drtf_m) && r !== s ? (s = "free_trial", o.scheduled_timer && await x(o.scheduled_timer)) : o._drtf_m || o[u] || r === s || (s = "free", o.scheduled_timer && await M(o.scheduled_timer)) : (s = "free", o.scheduled_timer && await M(o.scheduled_timer)), a = !1, chrome.storage.local.remove(["plan_info", "is_login"]);
                }
            })).catch((e => {}));
        } catch (e) {}
    }));
}

// Function to mark scheduled timers as extra scheduled
async function M(e) {
    return e.forEach(((e, t) => {
        e.isExtraScheduled = !!(e && t >= n);
    })), await chrome.storage.local.set({ scheduled_timer: e }), chrome.runtime.sendMessage({ action: "refresh_data" }), e;
}

// Function to reset extra scheduled timers
async function x(e) {
    return e.forEach(((e, t) => {
        e && (e.isExtraScheduled = !1);
    })), await chrome.storage.local.set({ scheduled_timer: e }), chrome.runtime.sendMessage({ action: "refresh_data" }), e;
}

// Function to sync all scheduled data
async function F(e, t, a, s) {
    e && 0 != e.length && await b(i + "api/schedule/scheduleAllData", { scheduled_timer: e, action: s, user_type: t, _drtf_m: a }).then((e => {
        1 == e.status && chrome.storage.local.set({ user_data_Set: !0 });
    })).catch((e => {}));
}

// Function to check if a certain condition is met
function E(e) {
    if (e && void 0 !== e) {
        const n = function(e) {
            const t = (e = e.replace(/-/g, "+").replace(/_/g, "/")).length % 4;
            return t && (e += "=".repeat(4 - t)), atob(e);
        }(e), r = new Date(n), o = (t = new Date, a = 1 == (t.getUTCMonth() + 1).toString().length ? "0" + (t.getUTCMonth() + 1) : t.getUTCMonth() + 1, s = 1 == t.getUTCDate().toString().length ? "0" + t.getUTCDate() : t.getUTCDate(), t.getFullYear() + "-" + a + "-" + s + "_" + t.getHours() + ":" + t.getMinutes() + ":" + t.getSeconds()).split("_")[0];
        return r.getFullYear() + "-" + ("0" + (r.getMonth() + 1)).slice(-2) + "-" + ("0" + r.getDate()).slice(-2) > o;
    }
    var t, a, s;
    return !1;
}

// Function to set a cookie
function $(e, t) {
    const a = { url: `${i}`, name: t, value: e, domain: "tab-scheduler.extfy.com", path: "", secure: !0, httpOnly: !0, expirationDate: (new Date).getTime() / 1e3 + 31536e4 };
    chrome.cookies.set(a, (e => {
        chrome.runtime.lastError;
    }));
}

// Function to generate a random string
function A(e) {
    let t = "";
    const a = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    for (let s = 0; s < e; s++) t += a.charAt(Math.floor(52 * Math.random()));
    return t;
}

// Function to encode a string to base64
function R(e) {
    const t = (new TextEncoder).encode(e);
    return btoa(String.fromCharCode(...t)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Function to validate a key
function O(e) {
    let t = chrome.runtime.id;
    return e._fxyz_s = e._fxyz_s.split(" "), e._fxyz_s = e._fxyz_s.map((e => e.slice(2, -2))), function(e) {
        return e.map((e => String.fromCharCode(e))).join("");
    }(e._fxyz_s) === t;
}

// Function to encode a string to base64
function Y(e) {
    return btoa(e).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Function to validate license key
async function C(e) {
    let t = function(e) {
        try {
            var t = e.replace(/-/g, "+").replace(/_/g, "/"), a = decodeURIComponent(atob(t).split("").map((function(e) {
                return "%" + ("00" + e.charCodeAt(0).toString(16)).slice(-2);
            })).join(""));
        } catch (t) {
            return e;
        }
        return a;
    }(e.slice(4, -3));
    fetch(`${i}lempay/validate.php`, { method: "POST", body: new URLSearchParams({ license_key: t, type: "validate" }) }).then((e => e.json())).then((e => {
        1 == e.success ? (chrome.storage.local.set({ [u]: A(4) + Y(t) + A(3) }), $(A(4) + Y(t) + A(3), u)) : (chrome.storage.local.remove([u]), $( "", u));
    })).catch((e => {}));
}

// Event listener for alarms
chrome.alarms.onAlarm.addListener((function(e) {
    new Date;
    var t = e.name.split("_")[0];
    "userAuthe" === e.name && (b(i + "api/user/userlogin", {}).catch((e => {})), chrome.storage.local.get(u, (function(e) {
        void 0 !== e[u] && "" !== e[u] && C(e[u]);
    }))), "" == t && null == t && null == t || (0 == e.scheduledTime && chrome.alarms.clear(t), chrome.storage.local.get(["scheduled_timer", "inactive_all_tab", "auto_focus", "plan_info", "user_type", "_drtf_m", "_dstrdmp", _], (async function(a) {
        if (!O(a)) return !1;
        if (0 !== a.inactive_all_tab && a.scheduled_timer && 0 != a.scheduled_timer.length) {
            let s = !0;
            const n = E(a?._drtf_m);
            (a.plan_info && a.plan_info.auto_focus || "old_user" === a?.user_type && !0 === n || a?._dstrdmp) && (s = a.auto_focus);
            a.scheduled_timer.forEach(((a, s) => {
                var n = a.id + "_" + a.timer_repeat;
                let r = !1;
                if (a?.isExtraScheduled && (r = !0), n.split(!r && "_")[0] + "_" + n.split("_")[1] == e.name.split("_")[0] + "_" + e.name.split("_")[1] && 1 == parseInt(a.flag)) {
                    var o = a.tabid.split(",").map((function(e) {
                        return Number(e);
                    }));
                    chrome.tabs.query({}, (function(e) {
                        e && 0 != e.length && e.forEach(((e, t) => {
                            var s = a.url_name.replace(/(^\w+:|^)\/\//, "");
                            s = s.replace("www", "");
                            var n = a.close_url_filter, r = s.slice(-1), i = e.url.replace(/(^\w+:|^)\/\//, "");
                            if (o.indexOf(e.id) > -1) {
                                if (1 == parseInt(n) && 1 == parseInt(a.tab_status)) s = (s = (s = s.replace(/\*$/, "")).substring(1), i.indexOf(s) > -1 && 1 === parseInt(a.tab_status) && m(e, a);
                                else if (i.replace(/\/$/, "") == s.replace(/\/$/, "") && 1 === parseInt(a.tab_status)) m(e, a);
                                else if (s.startsWith("*") && "*" === r) s = (s = s.replace(/\*$/, "")).substring(1), i.indexOf(s) > -1 && 1 === parseInt(a.tab_status) && m(e, a);
                                else if (s.startsWith("*")) {
                                    i = i.replace(/\/$/, ""), s = s.replace(/\/$/, ""), i.substr(i.length - (s.length - 1)).replace(/\/$/, "") === s.substr(s.length - (s.length - 1)) && 1 === parseInt(a.tab_status) && m(e, a);
                                } else if ("*" === r) {
                                    s = (s = s.replace(/\*$/, "")).replace(/\/$/, ""), i.slice(0, s.length).replace(/\/$/, "") === s && 1 === parseInt(a.tab_status) && m(e, a);
                                }
                                var _ = e.url.split("/");
                                "tab_settings.html" == _[_length - 1] && "none" == a.timer_repeat && chrome.tabs.reload(e.id);
                            }
                        }));
                    }));
                } else if (!r && "tabclose" === t) {
                    var i = parseInt(e.name.split("_")[1]), _ = parseInt(e.name.split("_")[2]);
                    parseInt(a.id) == i && chrome.tabs.query({}, (function(e) {
                        e.forEach(((e, t) => {
                            var s = a.url_name.replace(/(^\w+:|^)\/\//, ""), n = a.close_url_filter, r = s.slice(-1), o = e.url.replace(/(^\w+:|^)\/\//, "");
                            a.not_close_pinned_tab && a.not_close_pinned_tab;
                            if (1 == parseInt(n) && _ === e.id && 1 == parseInt(a.tab_status)) s = (s = (s = s.replace(/\*$/, "")).replace("www", "")).substring(1), o.indexOf(s) > -1 && 1 === parseInt(a.tab_status) && m(e, a);
                            else if (o.replace(/\/$/, "") == s.replace(/\/$/, "") && _ === e.id && 1 === parseInt(a.tab_status)) m(e, a);
                            else if (s.startsWith("*") && "*" === r && _ === e.id && 1 === parseInt(a.tab_status)) s = (s = s.replace(/\*$/, "")).substring(1), o.indexOf(s) > -1 && m(e, a);
                            else if (s.startsWith("*") && _ === e.id && 1 === parseInt(a.tab_status)) {
                                o = o.replace(/\/$/, ""), s = s.replace(/\/$/, ""), o.substr(o.length - (s.length - 1)).replace(/\/$/, "") === s.substr(s.length - (s.length - 1)) && 1 === parseInt(a.tab_status) && m(e, a);
                            } else if ("*" === r && _ === e.id && 1 === parseInt(a.tab_status)) {
                                s = (s = s.replace(/\*$/, "")).replace(/\/$/, ""), o.slice(0, s.length).replace(/\/$/, "") === s && m(e, a);
                            }
                            var i = e.url.split("/");
                            "tab_settings.html" == i[i.length - 1] && "none" == a.timer_repeat && chrome.tabs.reload(e.id);
                        }));
                    }));
                }
            }));
        }
        a.scheduled_timer.forEach(((t, a) => {
            let n = !1;
            if (t?.isExtraScheduled && (n = !0), n || "weekly" === t.timer_repeat || "opentab_" + t.id + "_" + t.timer_repeat != e.name || 1 !== parseInt(t.tab_status)) {
                var r = new Date;
                n || "weekly" !== t.timer_repeat || "opentab_" + t.id + "_" + t.timer_repeat + "_" + r.getDay() != e.name || 1 !== parseInt(t.tab_status) || p(t, a, s);
            } else p(t, a, s);
        }));
    }
}));

// Event listener for tab updates
chrome.tabs.onUpdated.addListener((function(e, t, a) {
    w(e, a), y();
}));

// Message listener for various actions
chrome.runtime.onMessage.addListener(((e, t, a) => {
    if ("send_suggestion" === e.action) {
        var { email: s, message: n, browserOsInfo: r } = e;
        return b("https://softpulseinfotech.com/extensions/tab_scheduler/feedback_api.php", { action: "feedback_tabscheduler", email: s, message: n, browserOsInfo: r, extension_version: chrome.runtime.getManifest().version }).then((e => {
            a(e);
        })).catch((e => {
            a({ message: "Success" });
        })), !0;
    }
    if ("clear_power" == e.action) y(), a({ message: "Success" });
    else if ("keep_awake" == e.action) chrome.storage.local.get("power_mode", (function(e) {
        e?.power_mode && chrome.power.requestKeepAwake("display");
    })), a({ message: "Success" });
    else if ("saveSchedule" == e.action) (_ = e.scheduled_obj) && 0 != _.length && b(i + "api/schedule/scheduleCreate", { scheduled_obj: _ }).then((e => {})).catch((e => {})), a({ message: "Success" });
    else if ("delete_schedule" == e.action) { 
        (o = e.scheduled_id) && "" !== o && b(i + "api/schedule/scheduleDelete", { scheduled_id: o }).then((e => {
            a(e);
        })).catch((e => {
            a(e);
        })), a({ message: "Success" });
    } else if ("schedule_status_change" == e.action) {
        var o;
        (o = e.scheduled_id) && "" !== o && b(i + "api/schedule/scheduleStatus", { scheduled_id: o, schedule_status: e.schedule_status }).then((e => {
            a(e);
        })).catch((e => {
            a(e);
        })), a({ message: "Success" });
    } else "saveImportSchedule" == e.action ? (chrome.storage.local.get(["user_type", "_drtf_m"], (async function(t) {
        F(e.scheduled_obj, t.user_type, t._drtf_m, "import_schedule");
    })), a({ message: "Success" })) : "save_settings" === e.action && (chrome.storage.local.get(["auto_focus", "inactive_all_tab", "power_mode", "dark_mode_tb"], (function(e) {
        const { auto_focus: t = 0, inactive_all_tab: s = 1, power_mode: n = 0, dark_mode_tb: r = 0 } = e;
        let o = { auto_focus_tb: t, inactive_all_tab: s, power_mode_tb: n, dark_mode_tb: r };
        b(i + "api/schedule/updateUserSettings", { action: "updateUserSettings", userSettingData: JSON.stringify(o) }).then((e => {
            a(e);
        })).catch((e => {
            a(e);
        }));
    })), a({ message: "Success" });
    var _;
}));

// Event listener for browser startup
chrome.runtime.onStartup.addListener((function() {
    chrome.alarms.clearAll((async function(e) {
        await b(i + "api/user/userlogin", {}).catch((e => {})), await k(), v(), chrome.storage.local.set({ settings_tab_id: "" }), chrome.storage.local.get(["inactive_all_tab", "scheduled_timer", "auto_focus", "plan_info", "user_type", "_drtf_m", "_dstrdmp", _], (function(e) {
            if (!O(e)) return !1;
            const t = E(e?._drtf_m);
            if (e.scheduled_timer && 0 !== e.inactive_all_tab) {
                var a = new Date;
                e.scheduled_timer.forEach(((s, n) => {
                    let r = !1;
                    s?.isExtraScheduled && (r = !0), !1 === r && "browser_open" == s.timer_repeat && s.browser_open.week_list.forEach(((n, r) => {
                        var o = n.split("_")[0];
                        if (7 == o && (o = 0), 1 === parseInt(s?.tab_status) && parseInt(a.getDay()) == parseInt(o) && ("both" === s?.schedule_type || "open" === s?.schedule_type)) {
                            let a = !0;
                            (e?.plan_info && e?.plan_info?.auto_focus || "old_user" === e?.user_type && !0 === t || e?._dstrdmp) && (a = e.auto_focus), p(s, 0, a);
                        }
                    }));
                }));
            }
            setTimeout((() => {
                chrome.alarms.getAll((e => {
                    chrome.storage.local.get("power_mode", (function(t) {
                        t?.power_mode && e.length > 0 && chrome.power.requestKeepAwake("display");
                    }));
                }));
            }), 100);
        }));
    })), S("userAuthe", { delayInMinutes: 1, periodInMinutes: 1 });
}));

// Uninstall URL for feedback
chrome.runtime.setUninstallURL("https://softpulseinfotech.com/extensions/tab_scheduler/feedback.php");

// Event listener for installation
chrome.runtime.onInstalled.addListener((function(e) {
    $("739E3ERT2B5SRSRFDFS964SSFFWR2SERGEGRT49A9WERRWERA582FFV223F2871D630", "_sub_key"), $("739E3ERT2B5SRSRFDFS964SSFFWR2SERGEDRT49A9WERRWERA582FFV223F2871D630", "_rel_key"), $("739E3ERT2B5SRSRFDFS964SSFFWR2SERGEXZT49A9WERRWERA582FFV223F2871D630", "_exp_key"), chrome.cookies.get({ url: i, name: u }, (e => {
        e && C(e.value);
    })), chrome.storage.local.get(["_fxyz_s", u], (function(e) {
        void 0 !== e._fxyz_s && null !== e._fxyz_s || chrome.storage.local.set({ _fxyz_s: "2310024 4510496 1211224 7810762 789763 4510763 349921 6711189 2110078 3410065 7810296 4511232 6310812 8910545 7511263 1510645 7410361 349891 8310463 4610782 9810827 8110237 5510399 6111149 1210932 4510567 4910861 469857 1710195 559920 6911025 6310664" });
    }));
    var t = new Date;
    if (chrome.storage.local.get("user_language", (function(e) {
        if (!e.user_language) {
            let e = chrome.i18n.getUILanguage();
            c.includes(e) ? chrome.storage.local.set({ user_language: e }) : chrome.storage.local.set({ user_language: "en" });
        }
    })), "update" == e.reason && chrome.storage.local.get(["inactive_all_tab", "dark_mode_tb", "auto_focus", "user_uid", "userdata", "open_tab_data", "user_data_Set", "user_type", "_drtf_m", "video_check", "scheduled_timer"], (function(e) {
        if (e?.open_tab_data?.length > 0 || e?.userdata?.length > 0) {
            chrome.runtime.getManifest();
            var t = [];
            e?.open_tab_data ? (e.open_tab_data.forEach((e => {
                void 0 !== e.open_in_incognito_mode && null !== e.open_in_incognito_mode || (e.open_in_incognito_mode = 0);
            })), e.open_tab_data.forEach((e => {
                t.push(e.id);
            }))) : t.push(1);
            var a = Math.max(...t) + 1, s = [];
            e?.open_tab_data && (s = e.open_tab_data.map((e => ({
                url_name: e.url_name,
                title: e.title ? e.title : "",
                open_time: e.timer_time ? e.timer_time : "",
                open_date: e.timer_date ? e.timer_date : "",
                open_weekday: e.weekday ? e.weekday : { week_id: e.id, week_list: [] },
                schedule_type: "open",
                back_url_open: e.back_url_open ? e.back_url_open : 0,
                id: e.id,
                notification: e.notification ? e.notification : "",
                description: e.description ? e.description : "",
                browser_open: e.browser_open ? e.browser_open : "",
                custom_open_minute: e.cus_minute ? e.cus_minute : "",
                custom_open_second: e.cus_second ? e.cus_second : "",
                tab_status: e.time_status,
                timer_repeat: e.timer_repeat,
                close_date: "",
                close_month_day: "",
                close_only_incognito_tab: 0,
                close_pin_tabs: 0,
                close_time: "",
                close_url_filter: 0,
                close_weekday: { week_id: e.id, week_list: [] },
                custom_close_minute: "",
                custom_close_second: "",
                flag: 0,
                open_in_incognito_mode: e.open_in_incognito_mode ? e.open_in_incognito_mode : 0,
                open_month_day: e.month_day ? e.month_day : "",
                every_hour_close_minute: e.every_hour_close_minute ? e.every_hour_close_minute : 0,
                every_hour_open_minute: e.every_hour_open_minute ? e.every_hour_open_minute : 0,
                open_url_sametab: e.open_url_sametab ? e.open_url_sametab : 0
            }))))), var n = [];
            e?.userdata && (n = e.userdata.map((e => ({
                url_name: e.url_name,
                title: "",
                open_time: "",
                open_date: "",
                open_weekday: { week_id: parseInt(a) + parseInt(e.id), week_list: [] },
                schedule_type: "close",
                back_url_open: 0,
                id: parseInt(a) + parseInt(e.id),
                notification: 0,
                description: "",
                browser_open: { week_id: parseInt(a) + parseInt(e.id), week_list: [] },
                custom_open_minute: "",
                custom_open_second: "",
                tab_status: e.tab_status,
                timer_repeat: e.timer_repeat,
                close_date: e.task_date ? e.task_date : "",
                close_month_day: e.month_day ? e.month_day : "",
                close_only_incognito_tab: e.close_only_incognito_tab ? e.close_only_incognito_tab : 0,
                close_pin_tabs: e.not_close_pinned_tab ? e.not_close_pinned_tab : 0,
                close_time: e.task_time ? e.task_time : "",
                close_url_filter: e.url_filter,
                close_weekday: { week_id: parseInt(a) + parseInt(e.id), week_list: [] },
                custom_close_minute: e.custom_minute ? e.custom_minute : "",
                custom_close_second: e.custom_second ? e.custom_second : "",
                flag: e.flag ? e.flag : 0,
                open_in_incognito_mode: 0,
                open_month_day: "",
                tabid: e.tabid ? e.tabid : "",
                every_hour_close_minute: e.every_hour_close_minute ? e.every_hour_close_minute : 0,
                every_hour_open_minute: e.every_hour_open_minute ? e.every_hour_open_minute : 0,
                open_url_sametab: e.open_url_sametab ? e.open_url_sametab : 0
            }))));
            var r = s.concat(n);
            chrome.storage.local.set({ scheduled_timer: r, userdata: [], open_tab_data: [] }, (function() {
                v(), chrome.tabs.query({}, (function(e) {
                    e.forEach((e => {
                        e?.url && e?.id && w(e.id, e);
                    }));
                }));
            }));
        }
        void 0 !== e.inactive_all_tab && void 0 !== e.dark_mode_tb && void 0 !== e.auto_focus && void 0 !== e.user_uid && void 0 !== e.user_data_Set || chrome.storage.local.set({ inactive_all_tab: 1, dark_mode_tb: 0, auto_focus: 0, user_uid: T() }), void 0 !== e.user_data_Set && null !== e.user_data_Set || chrome.storage.local.set({ user_data_Set: !1 });
        var o = new Date;
        o.setDate(o.getDate() + 180);
        var i = R(o);
        void 0 !== e.user_type && null !== e.user_type || chrome.storage.local.set({ user_type: "old_user" }), void 0 !== e._drtf_m && null !== e._drtf_m || chrome.storage.local.set({ _drtf_m: i }), void 0 !== e.video_check && null !== e.video_check || chrome.storage.local.set({ video_check: !1 }), null != e?.scheduled_timer && 0 != e?.scheduled_timer.length && (e.scheduled_timer.forEach((e => {
            e.every_hour_open_minute = e.every_hour_open_minute ? e.every_hour_open_minute : "0", e.every_hour_close_minute = e.every_hour_close_minute ? e.every_hour_close_minute : "0";
        })), chrome.storage.local.set({ scheduled_timer: e.scheduled_timer }));
    }
    if (e.reason === chrome.runtime.OnInstalledReason.INSTALL) {
        t.setDate(t.getDate() - 1);
        var a = R(t);
        chrome.storage.local.set({ inactive_all_tab: 1, dark_mode_tb: 0, auto_focus: 0, user_uid: T(), user_data_Set: !1, user_type: "new_user", _drtf_m: a, video_check: !1 });
    }
}));