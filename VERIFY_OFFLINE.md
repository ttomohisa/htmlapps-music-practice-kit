# Offline / local verification

1. Build with `build-standalone.bat`.
2. Open `dist/index.html` directly.
3. Verify metronome, TAP BPM, drone, timer, language switching, and settings work with networking disabled.
4. For tuner / recording tests, use an HTTPS or localhost deployment if the browser blocks microphone access from `file://`.
5. In DevTools, confirm the application makes no runtime network request after the initial page load.
6. Repeat the non-microphone checks with `dist/index.self-extract.html`.
