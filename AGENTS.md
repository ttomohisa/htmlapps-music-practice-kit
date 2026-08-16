# AGENTS.md — Music Practice Kit implementation contract

Read this file first, then `APP_SPEC.md`, `docs/ARCHITECTURE.md`, and the current source before editing.

## Non-negotiable constraints

- Generate `dist/index.html` and `dist/index.self-extract.html` as one-file release variants.
- Keep the runtime local-first: no CDN, remote font, analytics, telemetry, API call, or hidden network dependency.
- Keep CSP restrictive, including `connect-src 'none'`.
- User microphone audio must stay in the browser. Export happens only after an explicit user action.
- Use browser-native APIs unless a third-party dependency materially reduces risk.
- Desktop and smartphone layouts are first-class. Smartphone UI should feel like a native practice app rather than a squeezed desktop page.
- Japanese and English live in the same HTML.
- Light-only UI. Do not add a dark mode.
- Use inline SVG for interface icons instead of emoji iconography.
- Preserve visible focus, labels, safe-area spacing, keyboard access, reduced-motion behavior, and `aria-live` status where applicable.
- Do not edit generated files in `dist/` by hand. Edit `src/index.template.html` and rebuild.

## Product-specific rules

- Tuner and recorder may require a secure context depending on browser policy. The rest of the practice kit must remain usable without microphone access.
- Do not connect the microphone source to the audio destination; the app must not create feedback.
- Pitch detection must be throttled so it remains practical on mobile devices.
- Metronome timing must be scheduled against `AudioContext.currentTime`, not only `setInterval` timestamps.
- Stop or release microphone tracks, oscillators, timers, object URLs, and wake locks when no longer needed.
- Do not persist recording blobs in localStorage.
- Changes to audio behavior must be reflected in the help dialog.

## Source organization

Keep all runtime source in `src/index.template.html` while it remains understandable. Preserve the build placeholders exactly once:

- `__APP_CONFIG_JSON__`
- `__BUILD_MANIFEST_JSON__`
- `__EMBEDDED_ASSET_BUNDLE_BASE64__`

Keep design tokens and responsive rules near the top, translations in one object, and non-obvious audio algorithms commented.

## Required checks

Run:

```powershell
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-repository.ps1
```

Then build and verify:

```powershell
build-standalone.bat
```

Test at minimum:

- Fresh load and empty local storage.
- Japanese and English.
- 320–390px smartphone width and desktop width.
- Metronome start/stop, tempo changes, TAP BPM, accent, and time signature.
- Drone start/stop and pitch update.
- Practice timer start/pause/reset and completion.
- Tuner with microphone permission granted and denied.
- Instrument preset / string lock behavior.
- Recording start/stop/playback/download where MediaRecorder is available.
- Spectrum rendering.
- Wake lock available and unavailable paths.
- No microphone feedback and no runtime network request.
- No console errors in the tested browser.

Do not claim a device/browser test that was not actually performed.
