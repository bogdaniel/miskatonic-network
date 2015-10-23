"use strict";

function parseUri(str) {
    var o = parseUri.options,
        m = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
        uri = {},
        i = 14;

    while (i--) uri[o.key[i]] = m[i] || "";

    uri[o.q.name] = {};
    uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
        if ($1) uri[o.q.name][$1] = $2;
    });

    return uri;
}

parseUri.options = {
    strictMode: false,
    key: ["source", "protocol", "authority", "userInfo", "user", "password", "host", "port", "relative", "path", "directory", "file", "query", "anchor"],
    q: {
        name: "queryKey",
        parser: /(?:^|&)([^&=]*)=?([^&]*)/g
    },
    parser: {
        strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
        loose: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
    }
};

function replaceGet(url, getKey, getValue) {
    var parsed = parseUri(url);
    var uri = [];
    var found = false;

    for (var key in parsed.queryKey) {
        if (parsed.queryKey.hasOwnProperty(key)) {
            if (key == getKey) {
                parsed.queryKey[key] = getValue;
                found = true;
            }

            uri.push(key + '=' + parsed.queryKey[key]);
        }
    }

    if (!found) {
        uri.push(getKey + '=' + getValue);
    }

    if (getValue === '') {
        var index = uri.indexOf(getKey + '=' + getValue);
        if (index >= 0) {
            uri.splice(index, 1);
        }
    }

    if (uri.length) {
        uri = uri.join('&');
        uri = '?' + uri;
    }

    return parsed.path + uri;
}

function getNamespace() {
    var parsedUrl = parseUri(window.location.href);

    if (parsedUrl.path == '/') {
        return '/chat';
    }

    return parsedUrl.path;
}
