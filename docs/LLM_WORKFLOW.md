# LLM Workflow

For future changes:

1. Read `AGENTS.md`, `APP_SPEC.md`, and `docs/ARCHITECTURE.md`.
2. Inspect `src/index.template.html` before changing behavior.
3. Keep the app dependency-free unless a dependency clearly improves correctness.
4. Update the bilingual help whenever user-visible behavior changes.
5. Build via `build-standalone.bat`.
6. Run repository and standalone verification.
7. Test narrow smartphone and desktop layouts.
8. Test microphone granted, denied, and unavailable paths separately.
9. Check that microphone audio is never routed to speakers.
10. Confirm no runtime network request after load.
