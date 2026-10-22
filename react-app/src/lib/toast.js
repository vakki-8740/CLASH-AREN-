let handler = null;

export function setToastHandler(fn) {
    handler = fn;
    return () => {
        if (handler === fn) handler = null;
    };
}

export function toast(message, type = "") {
    if (handler) handler(message, type);
}
