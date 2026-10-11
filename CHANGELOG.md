# Changelog

## 1.0.4 - 2026-10-11

- Keep the background page still while a native modal is open, preserving the existing Help/confirmation layouts and local-processing shield.
- Add bilingual Help guidance and CSS contracts for root/body modal scroll locking. Browser wheel, dismissal, focus and content-reachability checks remain separate.

## 1.0.3 - 2026-10-10

- Replace the app icon with the supplied artwork in the canonical SVG, full-size header, and embedded favicon.
- Regenerate release HTML and the Browser Kitty root alias; verify icon and compressed-payload parity.
- Inherit the readable HTML favicon in the self-extracting loader.

## 1.0.2 - 2026-10-09

- Added a genuine screenshot from the v1.0.2 PR preview: English tuner with microphone off.
- Added explicit standalone-output and existing network-blocking metadata for catalog health checks.
- Kept application behavior, entrypoints, and network permissions unchanged.

## Unreleased

- Added Restart ramp / 最初から練習 to repeat from the configured start BPM and first beat without losing settings.
- Fixed 0% metronome volume still scheduling a positive gain envelope; mute also silences already queued clicks while visual timing continues.
- Fixed partial metronome startup/scheduling failures leaving a running-looking session with no scheduler; clean partial nodes, report localized retryable errors, and ignore stale callbacks.

- Added optional bar-based tempo ramps with start/target BPM, increase, and interval settings; Japanese/English UI and help.
- Added audible-tempo/countdown feedback, target holding, manual/TAP exit, and safe stop/restart/interruption handling.
- Added dependency-free timing/controller and standalone-build regressions; regenerate the Browser Kitty root alias with the release HTML.

## 1.0.1 - 2026-10-07

- Clarified the EN/JA language targets with localized accessible names and tooltips.
- Standardized the Japanese privacy badge to 完全ローカル処理 while retaining the accurate English audio-processing explanation.
- Added repeated language-switch and saved-language reload regressions; no audio or layout changes.

## 1.0.0 - 2026-08-16

- Initial Music Practice Kit release.
- Added chromatic, guitar, ukulele, and bass tuning modes.
- Added adjustable A4 reference pitch and live cents/frequency display.
- Added metronome with TAP BPM, time signatures, and first-beat accent.
- Added drone tone, practice timer, microphone recording, and spectrum view.
- Added optional screen wake lock on supported secure contexts.
- Added Japanese/English UI, responsive mobile-first layout, and local settings.
