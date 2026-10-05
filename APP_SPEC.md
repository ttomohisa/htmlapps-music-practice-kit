# APP_SPEC.md

## 1. Product identity

- **Name:** Music Practice Kit
- **Purpose:** Put the everyday tools needed for instrument practice into one local-first browser page.
- **Primary users:** Smartphone-first guitar, ukulele, bass, wind, string, keyboard, and general music learners.
- **Release artifacts:** `dist/index.html` and `dist/index.self-extract.html`
- **Languages:** Japanese and English in the same HTML.

## 2. Problem and outcome

Players often switch between a tuner, metronome, timer, drone/tone generator, recorder, and spectrum app during one practice session. Music Practice Kit keeps those tools together in one page without requiring an account, app installation, or audio upload.

A successful session lets a user:

1. Tune an instrument from the microphone.
2. Start a metronome at a chosen BPM, including TAP BPM and accented first beats.
3. Practice against a reference drone.
4. Run a practice timer without the screen sleeping when supported.
5. Record a take locally, listen back, and save it.
6. Inspect a lightweight frequency spectrum.

## 3. Core information hierarchy

1. **Tuner is the top hero.** Large note name and measured frequency are always the visual priority.
2. **Metronome is second.** BPM is large, start/stop is obvious, and TAP is one tap away.
3. **Practice tools follow.** Timer, drone, recorder, spectrum, and microphone controls are grouped without competing with the two primary tools.

On smartphones, a safe-area-aware bottom navigation scrolls to Tuner, Metronome, and Practice sections while keeping the page a single document.

## 4. Tuner requirements

- Microphone start/stop with explicit permission handling.
- Chromatic mode.
- Guitar: E2 A2 D3 G3 B3 E4.
- Ukulele: G4 C4 E4 A4 (high-G default).
- Bass: E1 A1 D2 G2.
- Instrument strings show as tappable chips. Tapping a string locks the tuning target; tapping again returns to automatic nearest-string mode.
- A4 reference adjustable from 430.0 to 450.0 Hz in 0.1 Hz steps.
- Display note + octave, measured frequency, cents offset, target frequency, and a needle / tuning zone.
- Clearly distinguish flat, in tune, and sharp states.
- Pitch detection should cover at least bass E1 through common upper instrument ranges.
- Ignore low-level noise with a user-adjustable input threshold.
- Show microphone input level.
- Do not route microphone audio to speakers.

## 5. Metronome requirements

- BPM range 30–300.
- Large start/stop button.
- BPM slider plus +/- buttons.
- TAP BPM using recent tap intervals, resetting after a long pause.
- Time signatures / beat counts from 2 through 7 beats per bar.
- Optional first-beat accent.
- Beat indicator visible on desktop and mobile.
- Use Web Audio scheduling against `AudioContext.currentTime` for stable timing.
- Optional tempo ramp: start/target 30–300 BPM, positive integer increase 1–270 BPM, every 1–64 complete bars. Defaults: 60 → 100, +5 every 4 bars.
- Increase only at the next bar start, clamp to the target and hold. Show audible BPM and bars until the next change.
- Stop/start resets the ramp. **Restart ramp / 最初から練習** provides a one-action reset while the ramp is running or interrupted: return to the start BPM, first beat and zero completed bars without changing settings. Disable it when stopped or in manual mode. Manual BPM controls and the first TAP exit ramp mode.
- Metronome volume 0% must produce zero gain, including already queued clicks, while beat visualization and ramp progress continue.
- Audio startup/scheduling failure must release partial metronome resources, restore a stopped, retryable state and show a localized error. Never stop an independent drone or timer.
- Editing ramp settings or meter during ramp playback requires stopping; toggling the mode restarts playback.
- Hidden pages/audio interruptions pause playback. Resume repeats the interrupted bar without counting background time or queuing catch-up clicks.

## 6. Drone requirements

- Start/stop without microphone permission.
- Select note and octave across a practical C2–B5 range.
- Respect the current A4 reference pitch.
- Sine and triangle wave choices.
- Independent volume control.
- Stop oscillator nodes cleanly when disabled.

## 7. Practice timer requirements

- Quick presets: 5 / 10 / 15 / 30 minutes.
- Custom minutes from 1–180.
- Start/pause/reset.
- Large remaining-time display and progress visualization.
- Short completion chime.
- Optional Screen Wake Lock when the API is available and allowed.
- Re-acquire a requested wake lock after returning to a visible page when possible.

## 8. Recording requirements

- Use the current microphone stream.
- If the microphone is off, recording action may request it.
- Use MediaRecorder when available.
- Pick a supported audio MIME type at runtime rather than assuming one container.
- Show elapsed recording time.
- On stop, create an in-memory Blob, playback control, and explicit download button.
- Filename format: `music-practice-YYYYMMDD-HHmmss.<ext>`.
- A new recording may replace the previous in-memory recording. If the previous recording has not been downloaded, confirm before discarding it. Clearing a recording also requires in-app confirmation.
- Recording is not stored in localStorage.

## 9. Spectrum requirements

- Use the same analyser as the tuner.
- Render a lightweight frequency-domain graph to Canvas.
- Show a useful low-to-mid frequency range instead of the entire Nyquist range.
- Pause rendering work when the page is hidden or the microphone is off.

## 10. Settings persistence

Persist only lightweight preferences when localStorage is available:

- Language.
- A4 reference.
- Tuner mode.
- Noise gate / input threshold.
- BPM.
- Beats per bar.
- Accent setting.
- Ramp mode and its four settings, never playback state.
- Drone note, wave, and volume.
- Timer preset/custom duration.
- Wake lock preference.

Do not persist microphone permission, device IDs as a hard requirement, audio buffers, or recordings.

## 11. Privacy and security

- No audio or settings are uploaded.
- No analytics, telemetry, account, or server storage.
- CSP includes `connect-src 'none'`.
- Microphone capture is initiated by user action and follows browser permission rules.
- Microphone-dependent features may require HTTPS or localhost on browsers that restrict capture in local-file contexts.

## 12. UX and accessibility

- Light-only interface based on the Single HTML App Template visual language.
- No marketing-heavy hero slogan.
- Mobile-first from 320px upward.
- Smartphone controls should have comfortable touch targets, bottom safe-area spacing, and app-like hierarchy.
- Header language and help controls remain visually minimal with transparent backgrounds.
- Visible focus states and keyboard-accessible controls.
- `aria-live` for permission, tuner, recorder, and timer status where appropriate.
- Respect `prefers-reduced-motion`.

## 13. Non-goals

- Cloud sync.
- User accounts.
- Social sharing service integration.
- Automatic transcription or AI analysis.
- Multitrack DAW features.
- Backing-track library.
- Persisting raw recordings between page sessions.

## 14. Acceptance criteria

- Generated standalone HTML contains no unresolved build placeholder and no runtime external resource reference.
- Metronome, TAP, drone, timer, language switch, help, and settings work without network access.
- Tuner, spectrum, and recorder work when the browser grants microphone access.
- Permission denial does not break non-microphone tools.
- Guitar, ukulele, and bass preset targets are correct under A4=440 Hz.
- Metronome BPM can change while running without restarting the page.
- Recording download uses a MIME-appropriate extension.
- No microphone signal is connected to `AudioContext.destination`.
- Mobile UI remains usable at 360px width without horizontal page scrolling.
- Help content documents microphone, recording, local processing, and browser limitations.
