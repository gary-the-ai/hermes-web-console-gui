# Changelog

All notable changes to the Hermes Web Console will be documented in this file.

## [Unreleased]

### Added
- **Missions Kanban Board**: New `/missions` overarching route providing an intuitive HTML5 drag-and-drop interface for managing agent tasks with Backlog, In Progress, Review, and Done columns.
- **Dashboard Command Center**: Live-polling overarching global interface tracking CPU limits, host memory footprint, active Cron Jobs, and background operations in real-time.
- **CLI Session Bridge**: Sessions viewer now imports and segregates interactions made natively in the CLI vs the Web UI via SQLite reads.
- **Rich Vision Input**: Added glow-visualized drag-and-drop dropzones over the main chat composer to securely facilitate image context streaming.
- **Workspace File @Mentions**: Introduced an elegant native popup autocomplete inside the chat composer. Type `@` to select local workspace files to be injected efficiently into context.
- **Portable Mode (Backend Agnostic)**: The UI now degrades gracefully when the Hermes core backend is down, exposing a red health banner instead of crashing the interface with 500s.
- **PWA Installation**: Fully initialized `manifest.json`, local `<link>` tags, generated icon sets, and an offline-ready `sw.js` Service Worker to run Hermes natively on any Desktop or device.
- **Docker Strategy**: Created standalone `Dockerfile.frontend` and `Dockerfile.backend` setups composed via `docker-compose.yml` to instantly spin up the proxy architectures seamlessly.

### Fixed
- Replaced deprecated `apple-mobile-web-app-capable` meta tags natively inside `index.html`.
- Implemented robust `ConnectionProvider` polling states preventing error-log flooding in DevTools when backend connectivity is severed.
- Adjusted CSS spacing within `MissionsPage.tsx` using `overflowX: 'auto'` to ensure the fourth boundary column isn't obscured out of frame relative to the Inspector pane.
