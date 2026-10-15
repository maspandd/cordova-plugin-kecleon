# Kecleon 🦎

**A Cordova plugin that hides your Android app from screenshots and screen recordings, and tells you when someone tries.**

Like the Pokémon Kecleon, which turns invisible, your sensitive screens disappear from every capture:

| Without Kecleon | With `Kecleon.enable()` |
|---|---|
| Screenshots and recordings show everything | Screenshots are blocked, recordings come out **black**, and the recent-apps thumbnail is hidden |
| You never know a capture happened | Your JS gets a `screenshot` or `captureChange` event, even while capture is blocked |

```js
await Kecleon.enable();                                   // block capture
Kecleon.on('screenshot', () => alert('Screenshot blocked'));
Kecleon.on('captureChange', ({ captured }) => console.log('recording:', captured));
await Kecleon.disable();                                  // allow capture again
```

## At a glance

- **Platform:** Android 9 – 17 (API 28–37), written in Kotlin, needs `cordova-android >= 14` (MABS 12+)
- **Blocking:** uses Android's `FLAG_SECURE`, which works on every supported version
- **Detection:** the `screenshot` event works on Android 14+, and recording detection on Android 15+
- **API:** Promise-based, with TypeScript types included
- **No permission prompts:** both detection permissions are granted at install
- **Tested on a real device:** Android 16 (Infinix X6873). Screenshots were blocked, recordings came out black, and both events fired

## Install

**Cordova:**

```bash
cordova plugin add cordova-plugin-kecleon@0.1.0
```

**OutSystems 11 (MABS 12+):** put this in the wrapper module's Extensibility Configurations:

```json
{ "plugin": { "identifier": "cordova-plugin-kecleon@0.1.0" } }
```

## Repository layout

```
├── cordova-plugin-kecleon/   The plugin: plugin.xml, www/ (JS), src/android/ (Kotlin), types/
│   ├── spec/                 Jest unit tests          → npm test
│   └── tests/                On-device tests (cordova-plugin-test-framework)
└── example/                  Demo / QA app with Enable, Disable and Status buttons and a live event log
```

📖 **Full API, version support table and caveats:** [cordova-plugin-kecleon/README.md](cordova-plugin-kecleon/README.md)

## Run the example app

```bash
cd example && npm install && cordova prepare android
```
```bash
npm run android
```

Building needs JDK 21 (Gradle 8.14 does not run on JDK 25).

## License

[MIT](cordova-plugin-kecleon/LICENSE)
