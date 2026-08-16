# Music Practice Kit

A smartphone-first, single-page browser toolkit for everyday instrument practice.

It combines a **tuner, metronome, TAP BPM, drone tone, practice timer, recorder, and frequency spectrum** in one self-contained HTML app. Audio processing and lightweight settings stay in the browser.

[日本語 README](README.ja.md)

## Features

- Chromatic tuner
- Standard guitar tuning: E2 / A2 / D3 / G3 / B3 / E4
- High-G ukulele: G4 / C4 / E4 / A4
- 4-string bass: E1 / A1 / D2 / G2
- Adjustable A4 reference from 430.0 to 450.0 Hz
- Frequency, cents offset, and tuning needle
- 30–300 BPM metronome
- TAP BPM, 2–7 beats per bar, first-beat accent, and volume
- C2–B5 drone tone with sine / triangle waveforms
- 5 / 10 / 15 / 30 minute presets plus a custom practice timer
- Screen Wake Lock where supported
- Local MediaRecorder capture, playback, and file download
- Live microphone frequency spectrum
- Japanese / English UI
- Smartphone bottom navigation with safe-area support

## Privacy

Microphone audio, recordings, and settings are processed inside the page. The app does not upload audio to a server. Its runtime CSP keeps `connect-src 'none'`, and there is no analytics or telemetry dependency.

Recordings are kept only in memory and leave the page only when you explicitly download them. Unsaved recordings are lost when the page is closed.

## Microphone access

The tuner, recorder, and spectrum require microphone permission. Some browsers restrict microphone capture from local `file://` pages; use HTTPS or localhost when needed.

The metronome, TAP BPM, drone, and timer work without microphone permission.

## Build

On Windows:

```powershell
.\build-standalone.bat
```

Outputs:

- `dist/index.html` — readable self-contained HTML
- `dist/index.self-extract.html` — gzip self-extracting variant

Repository check:

```powershell
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-repository.ps1
```

## Source layout

```text
src/index.template.html      Editable application source
APP_SPEC.md                  Product and acceptance contract
app.config.json              Product metadata
dependencies.json            Embedded dependencies (currently none)
build-standalone.ps1         Single-file builder
dist/                        Generated artifacts
.github/workflows/           Build and GitHub Pages workflows
```

Do not hand-edit `dist/`; edit the source and rebuild.

## Browser target

Current stable desktop and mobile Chromium, Firefox, and Safari. API-dependent behavior such as recording containers, wake lock, and input-device labels varies by browser.

## License

MIT License
