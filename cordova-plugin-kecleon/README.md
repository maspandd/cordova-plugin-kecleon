# cordova-plugin-kecleon

> Like Kecleon, your app turns invisible when someone tries to capture it.

Prevent and detect screenshots and screen recording in Cordova **Android** apps.

- Android 9 – 17 (minSdk 28, built against API 36), written in Kotlin
- Requires `cordova-android >= 15`

## Install

```bash
cordova plugin add cordova-plugin-kecleon
```

The plugin turns on Kotlin for the Android build (`GradlePluginKotlinEnabled`) and adds the
`DETECT_SCREEN_CAPTURE` and `DETECT_SCREEN_RECORDING` permissions. Both are normal
install-time permissions, so users never see a prompt.

## Usage

```js
document.addEventListener('deviceready', async () => {
    await Kecleon.enable();

    const stop = Kecleon.on('screenshot', () => showToast('Screenshot detected'));
    Kecleon.on('captureChange', ({ captured }) => setRecordingBanner(captured));

    // A recording that started before you subscribed raises no event, so check once.
    setRecordingBanner(await Kecleon.isCaptured());
});

// When leaving the sensitive screen:
await Kecleon.disable();
```

TypeScript types ship in `types/index.d.ts`.

## API

| Method | Resolves | Notes |
|---|---|---|
| `enable()` | `void` | Sets `FLAG_SECURE`: screenshots and recordings are blocked or come out black, and the recent-apps thumbnail is hidden |
| `disable()` | `void` | |
| `isEnabled()` | `boolean` | |
| `isCaptured()` | `boolean \| null` | Whether the app is visible in an active recording. `null` below Android 15 |
| `getCapabilities()` | `{ canDetectScreenshot, canDetectRecording }` | What this device supports |
| `on(event, cb)` | returns `unsubscribe()` | Events: `screenshot`, `captureChange` (`{ captured }`) |
| `off(event, cb)` | | |

Rejected promises carry an `Error` with a `code`: `NO_ACTIVITY`, `NATIVE_ERROR` or `UNKNOWN`.

## Version support

| | Android 9–13 (API 28–33) | Android 14 (API 34) | Android 15–17 (API 35–37) |
|---|---|---|---|
| Block screenshots & recording | ✅ | ✅ | ✅ |
| Hide recent-apps thumbnail | ✅ | ✅ | ✅ |
| `screenshot` event | ❌ | ✅ | ✅ |
| `captureChange` event / `isCaptured()` | ❌ | ❌ | ✅ |

## Caveats

- **`FLAG_SECURE` only protects the main activity window.** Dialogs, InAppBrowser and other
  plugins' windows are separate windows and are not covered.
- **Android 13 and below give no screenshot signal.** Watching MediaStore would need
  media-read permissions and raises Play policy concerns, so this plugin doesn't do it.
- **Events still fire while protection is on.** Verified on Android 16: while `FLAG_SECURE`
  is set, a screenshot attempt is blocked but still raises `screenshot`, and a recording comes
  out black but still raises `captureChange`. That lets you react to an attempt, for example
  with a warning.
- **No protection stops someone photographing the screen with another device.**

## Development

```bash
npm install
npm test          # Jest unit tests for the JS layer (spec/)
```

To run the on-device tests, add `tests/` to a test-framework app (or use cordova-paramedic).
The `../example` app is set up for manual QA.
