'use strict';

const exec = require('cordova/exec');

const SERVICE = 'Kecleon';
const EVENTS = ['screenshot', 'captureChange'];

const listeners = {};
EVENTS.forEach((name) => { listeners[name] = []; });

let channelOpen = false;

function toError (err) {
    const message = (err && err.message) || (typeof err === 'string' ? err : 'Unknown native error');
    const error = new Error(message);
    error.code = (err && err.code) || 'UNKNOWN';
    return error;
}

function call (action, args) {
    return new Promise((resolve, reject) => {
        exec(resolve, (err) => reject(toError(err)), SERVICE, action, args || []);
    });
}

function dispatch (event) {
    if (!event || !listeners[event.type]) return;
    const payload = Object.assign({}, event);
    listeners[event.type].slice().forEach((cb) => {
        try {
            cb(payload);
        } catch (e) {
            // A throwing listener must not break the others; surface it asynchronously.
            setTimeout(() => { throw e; });
        }
    });
}

function openChannel () {
    if (channelOpen) return;
    channelOpen = true;
    exec(dispatch, (err) => {
        channelOpen = false;
        console.error('[Kecleon] event channel failed:', toError(err));
    }, SERVICE, 'listen', []);
}

const Kecleon = {
    /** Block screenshots, recordings and the recent-apps thumbnail (FLAG_SECURE). */
    enable () {
        return call('enable').then(() => undefined);
    },

    /** Turn protection off. */
    disable () {
        return call('disable').then(() => undefined);
    },

    /** @returns {Promise<boolean>} */
    isEnabled () {
        return call('isEnabled').then((r) => !!(r && r.enabled));
    },

    /**
     * Whether the app is visible in an active screen recording.
     * @returns {Promise<boolean|null>} null below Android 15, where this can't be detected.
     */
    isCaptured () {
        return call('isCaptured').then((r) => (r && typeof r.captured === 'boolean' ? r.captured : null));
    },

    /** @returns {Promise<{canDetectScreenshot: boolean, canDetectRecording: boolean}>} */
    getCapabilities () {
        return call('getCapabilities');
    },

    /**
     * Subscribe to `screenshot` or `captureChange` events.
     * @returns {function(): void} unsubscribe
     */
    on (eventName, callback) {
        if (EVENTS.indexOf(eventName) === -1) {
            throw new TypeError('Unknown event "' + eventName + '". Expected one of: ' + EVENTS.join(', '));
        }
        if (typeof callback !== 'function') {
            throw new TypeError('callback must be a function');
        }
        listeners[eventName].push(callback);
        openChannel();
        return () => Kecleon.off(eventName, callback);
    },

    off (eventName, callback) {
        const list = listeners[eventName];
        if (!list) return;
        const i = list.indexOf(callback);
        if (i !== -1) list.splice(i, 1);
    }
};

module.exports = Kecleon;
