/* global Kecleon */
'use strict';

// On-device tests for cordova-plugin-test-framework (run with cordova-paramedic
// or the test-framework app). Screenshot / recording events need a human, so
// they live in the manual tests below.

exports.defineAutoTests = function () {
    describe('Kecleon', () => {
        afterEach((done) => { Kecleon.disable().then(done, done); });

        it('is exposed on window', () => {
            expect(window.Kecleon).toBeDefined();
            expect(typeof Kecleon.enable).toBe('function');
        });

        it('reports capabilities', (done) => {
            Kecleon.getCapabilities().then((caps) => {
                expect(typeof caps.canDetectScreenshot).toBe('boolean');
                expect(typeof caps.canDetectRecording).toBe('boolean');
                // Recording detection (API 35) implies screenshot detection (API 34).
                if (caps.canDetectRecording) expect(caps.canDetectScreenshot).toBe(true);
            }).then(done, done.fail);
        });

        it('toggles enabled state', (done) => {
            Kecleon.enable()
                .then(() => Kecleon.isEnabled())
                .then((on) => { expect(on).toBe(true); })
                .then(() => Kecleon.disable())
                .then(() => Kecleon.isEnabled())
                .then((on) => { expect(on).toBe(false); })
                .then(done, done.fail);
        });

        it('isCaptured is null exactly when recording detection is unsupported', (done) => {
            Promise.all([Kecleon.isCaptured(), Kecleon.getCapabilities()]).then(([captured, caps]) => {
                if (caps.canDetectRecording) {
                    expect(typeof captured).toBe('boolean');
                } else {
                    expect(captured).toBeNull();
                }
            }).then(done, done.fail);
        });
    });
};

exports.defineManualTests = function (contentEl, createActionButton) {
    const log = document.createElement('pre');

    function write (label, value) {
        log.textContent = label + ' ' + JSON.stringify(value) + '\n' + log.textContent;
    }

    Kecleon.on('screenshot', (e) => write('event', e));
    Kecleon.on('captureChange', (e) => write('event', e));

    createActionButton('Enable', () => Kecleon.enable().then(() => write('enable', 'ok')));
    createActionButton('Disable', () => Kecleon.disable().then(() => write('disable', 'ok')));
    createActionButton('Is captured?', () => Kecleon.isCaptured().then((c) => write('captured', c)));

    contentEl.innerHTML = '<p>Take a screenshot and start/stop a screen recording. Expect events below ' +
        '(Android 14+ / 15+); with protection on, captures should be blocked or black.</p>';
    contentEl.appendChild(log);
};
