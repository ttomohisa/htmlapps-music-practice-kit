# Verification report

Verified on 2026-08-16 in the build environment:

- Required repository files are present.
- Each build placeholder appears exactly once in source and none remain in `dist/index.html`.
- `connect-src 'none'` is present in the generated CSP.
- No external runtime script, stylesheet, iframe, `fetch`, `XMLHttpRequest`, `WebSocket`, or `sendBeacon` path is present.
- No duplicate HTML IDs were found.
- The generated inline JavaScript passes `node --check`.
- The gzip self-extract payload restores byte-for-byte to `dist/index.html`.
- Standard guitar / ukulele / bass target frequencies were sanity-checked at A4=440 Hz.
- The pitch detector was tested with generated sine waves at 41.2034, 82.4069, 110, 261.6256, 440, 880, and 1318.51 Hz; all tested cases were within 1 cent and above the app's confidence threshold.

Not verified in this environment:

- Interactive browser layout screenshots.
- Physical microphone permission and capture on a real phone.
- Real-instrument tuning accuracy in a noisy room.
- Screen Wake Lock behavior on a physical mobile device.

Reason: the available Chromium installation is controlled by an administrator policy that blocks navigation to localhost, `file:` URLs, and `data:` URLs.


## Tempo-ramp change — 2026-10-04

Verified in the cloud build environment (Node + official PowerShell):

- 32 automated tests pass: deterministic inline-runtime timing/controller tests and standalone artifact checks.
- Covers all 2–7 beat meters, 30–300 BPM extremes, 1/64-bar intervals, non-divisible target clamping, target hold, UI countdown, repeated start, stop/restart, manual/slider/stepper/TAP exits, queued-boundary cancellation, hidden-page and AudioContext interruption, invalid persisted/input values, and JA/EN initialization without autoplay.
- Manual accent/meter changes, independent drone lifetime, and synthetic tuner pitch detection regressions pass.
- Repository checks and standalone build/verification pass. For the Linux build, a temporary `powershell.exe` command alias points to the installed official `pwsh`, because the build script invokes the Windows command name.
- Generated inline JavaScript parses; no duplicate IDs or external runtime dependency appears; CSP remains restrictive.
- `music-practice-kit.html` exactly matches `dist/index.html`, and the self-extracting gzip payload restores the same bytes.

Pending separate real-browser/preview QA: desktop and 320–390px layouts, real Web Audio output, physical microphone/recorder/wake-lock behavior, and browser console/network observations. Deterministic fixtures do not claim those device checks.
