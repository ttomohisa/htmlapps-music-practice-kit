# Architecture

The repository follows the Single HTML App Template model:

```text
app.config.json
APP_SPEC.md
dependencies.json
src/index.template.html
build-standalone.ps1
scripts/check-repository.ps1
scripts/verify-standalone.ps1
dist/index.html
dist/index.self-extract.html
```

## Runtime modules inside the single HTML

- App shell / localization / localStorage preferences.
- Audio context manager shared by metronome and drone.
- Microphone manager shared by tuner, spectrum, and recorder.
- YIN-style pitch estimator throttled on the animation loop.
- Metronome scheduler based on Web Audio clock look-ahead scheduling. Ramp progress advances only at complete bar boundaries. Scheduled beat snapshots separate future tempo from audible/UI tempo; tracked nodes/timers are cancelled on stop or mode changes. Visibility/audio interruptions rebase at the same bar and tempo, so stalled timers never emit a catch-up burst.
- Restart ramp reuses stop/start cancellation. A playback-session token rejects stale interval/resume-failure work; a schedule-version token rejects old beat-on/off callbacks after stop, pause, manual override, or restart. Node ownership is registered before construction completes so partial allocation is cleaned independently.
- Zero-volume clicks use an exact-zero gain instead of the positive exponential-envelope floor; muting cancels pending metronome gain automation without changing beat snapshots or the independent drone.
- Drone oscillator manager.
- Drift-corrected practice timer.
- MediaRecorder wrapper and object-URL lifecycle.
- Canvas spectrum renderer.
- Optional Screen Wake Lock manager.

The microphone `MediaStreamAudioSourceNode` connects only to an `AnalyserNode`; it is never connected to the destination.

## Build placeholders

`src/index.template.html` contains exactly one of:

- `__APP_CONFIG_JSON__`
- `__BUILD_MANIFEST_JSON__`
- `__EMBEDDED_ASSET_BUNDLE_BASE64__`

The app currently has no third-party assets, so the embedded asset bundle is empty while preserving template compatibility.

The build also writes `music-practice-kit.html`, the Browser Kitty root alias, byte-identical to `dist/index.html`. Dependency-free Node tests cover the actual inline runtime in a deterministic DOM/audio fixture and verify all generated artifacts.

## Brand assets

`assets/favicon.svg` is the canonical supplied artwork. The source template embeds the same SVG in the full-size header and favicon. The self-extracting loader inherits the readable HTML favicon; icon regression tests compare all source and generated copies.
