'use strict';

let exec;
let Kecleon;

function load () {
    jest.isolateModules(() => {
        exec = jest.fn();
        jest.doMock('cordova/exec', () => exec, { virtual: true });
        Kecleon = require('../www/kecleon');
    });
}

// Make the next native call succeed or fail with the given payload.
function nativeResolves (payload) {
    exec.mockImplementationOnce((ok) => ok(payload));
}
function nativeRejects (payload) {
    exec.mockImplementationOnce((ok, fail) => fail(payload));
}

beforeEach(load);

describe('actions', () => {
    test('enable calls native and resolves undefined', async () => {
        nativeResolves();
        await expect(Kecleon.enable()).resolves.toBeUndefined();
        expect(exec).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), 'Kecleon', 'enable', []);
    });

    test('disable resolves undefined', async () => {
        nativeResolves();
        await expect(Kecleon.disable()).resolves.toBeUndefined();
        expect(exec.mock.calls[0][3]).toBe('disable');
    });

    test('isEnabled unwraps the boolean', async () => {
        nativeResolves({ enabled: true });
        await expect(Kecleon.isEnabled()).resolves.toBe(true);
    });

    test.each([
        [{ captured: true }, true],
        [{ captured: false }, false],
        [{ captured: null }, null],
        [undefined, null]
    ])('isCaptured(%p) -> %p', async (payload, expected) => {
        nativeResolves(payload);
        await expect(Kecleon.isCaptured()).resolves.toBe(expected);
    });

    test('getCapabilities passes the native object through', async () => {
        const caps = { canDetectScreenshot: true, canDetectRecording: false };
        nativeResolves(caps);
        await expect(Kecleon.getCapabilities()).resolves.toEqual(caps);
    });

    test('native errors become Error objects with a code', async () => {
        nativeRejects({ code: 'NO_ACTIVITY', message: 'No foreground activity' });
        const err = await Kecleon.enable().catch((e) => e);
        expect(err).toBeInstanceOf(Error);
        expect(err.code).toBe('NO_ACTIVITY');
        expect(err.message).toBe('No foreground activity');
    });

    test('string errors get code UNKNOWN', async () => {
        nativeRejects('boom');
        await expect(Kecleon.disable()).rejects.toMatchObject({ code: 'UNKNOWN', message: 'boom' });
    });
});

describe('events', () => {
    function channel () {
        const call = exec.mock.calls.find((c) => c[3] === 'listen');
        return { emit: call[0], fail: call[1] };
    }

    test('first on() opens one listen channel', () => {
        Kecleon.on('screenshot', () => {});
        Kecleon.on('captureChange', () => {});
        expect(exec.mock.calls.filter((c) => c[3] === 'listen')).toHaveLength(1);
    });

    test('events are routed to listeners of that type only', () => {
        const shot = jest.fn();
        const capture = jest.fn();
        Kecleon.on('screenshot', shot);
        Kecleon.on('captureChange', capture);

        channel().emit({ type: 'captureChange', captured: true });

        expect(capture).toHaveBeenCalledWith({ type: 'captureChange', captured: true });
        expect(shot).not.toHaveBeenCalled();
    });

    test('unsubscribe stops delivery', () => {
        const cb = jest.fn();
        const off = Kecleon.on('screenshot', cb);
        off();
        channel().emit({ type: 'screenshot' });
        expect(cb).not.toHaveBeenCalled();
    });

    test('off() removes only the given callback', () => {
        const a = jest.fn();
        const b = jest.fn();
        Kecleon.on('screenshot', a);
        Kecleon.on('screenshot', b);
        Kecleon.off('screenshot', a);
        channel().emit({ type: 'screenshot' });
        expect(a).not.toHaveBeenCalled();
        expect(b).toHaveBeenCalledTimes(1);
    });

    test('a throwing listener does not block the others', () => {
        jest.useFakeTimers();
        const good = jest.fn();
        Kecleon.on('screenshot', () => { throw new Error('bad listener'); });
        Kecleon.on('screenshot', good);

        channel().emit({ type: 'screenshot' });

        expect(good).toHaveBeenCalledTimes(1);
        expect(() => jest.runAllTimers()).toThrow('bad listener');
        jest.useRealTimers();
    });

    test('unknown or malformed events are ignored', () => {
        const cb = jest.fn();
        Kecleon.on('screenshot', cb);
        channel().emit({ type: 'nope' });
        channel().emit(null);
        expect(cb).not.toHaveBeenCalled();
    });

    test('channel reopens after a native failure', () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        Kecleon.on('screenshot', () => {});
        channel().fail({ code: 'X', message: 'gone' });
        Kecleon.on('screenshot', () => {});
        expect(exec.mock.calls.filter((c) => c[3] === 'listen')).toHaveLength(2);
        console.error.mockRestore();
    });

    test('on() validates its arguments', () => {
        expect(() => Kecleon.on('recording', () => {})).toThrow(TypeError);
        expect(() => Kecleon.on('screenshot', 'nope')).toThrow(TypeError);
        expect(exec).not.toHaveBeenCalled();
    });
});
