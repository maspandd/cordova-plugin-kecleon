'use strict';

const logEl = document.getElementById('log');

function log (label, value) {
    const time = new Date().toLocaleTimeString();
    const text = value === undefined ? '' : ' ' + JSON.stringify(value);
    logEl.textContent = time + '  ' + label + text + '\n' + logEl.textContent;
}

function run (label, promise) {
    promise.then((r) => log(label, r)).catch((e) => log(label + ' FAILED', { code: e.code, message: e.message }));
}

document.addEventListener('deviceready', () => {
    Kecleon.on('screenshot', (e) => log('event', e));
    Kecleon.on('captureChange', (e) => log('event', e));

    document.getElementById('btn-enable').addEventListener('click', () => run('enable', Kecleon.enable()));
    document.getElementById('btn-disable').addEventListener('click', () => run('disable', Kecleon.disable()));
    document.getElementById('btn-status').addEventListener('click', () => {
        run('status', Promise.all([Kecleon.isEnabled(), Kecleon.isCaptured(), Kecleon.getCapabilities()])
            .then(([enabled, captured, capabilities]) => ({ enabled, captured, capabilities })));
    });
    document.getElementById('btn-clear').addEventListener('click', () => { logEl.textContent = ''; });

    run('capabilities', Kecleon.getCapabilities());
}, false);
