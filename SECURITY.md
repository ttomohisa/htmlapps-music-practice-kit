# Security and privacy

Music Practice Kit is designed as a local-first single HTML application.

- Audio captured from the microphone is processed in the browser.
- Recording blobs remain in memory until the page is closed or the user clears them.
- Settings are stored in `localStorage` when available.
- The app does not upload audio, analytics, telemetry, or settings.
- The generated HTML uses a Content Security Policy with `connect-src 'none'`.
- Microphone access is permission-gated by the browser and may require HTTPS or localhost.

If you discover a security issue, report it through the repository's private security reporting channel when available.
