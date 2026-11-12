# ntbk

A digital notebook with rich-text pages organized into independent notebooks, and cloud sync for web accounts. The interface is currently in Spanish. The Tauri desktop app stores its notebook locally and does not yet support accounts or sync.

## Features

- Rich-text pages with formatting, task lists, code blocks, and links between pages.
- Multiple notebooks with pages, drag-and-drop page organization, favorites, and full-text search.
- Embedded charts and spreadsheets with formulas and multiple sheets.
- Inline images and downloadable PDF attachments (10 MiB per file, 100 MiB per account).
- Installable web app with offline editing and automatic sync; conflicting page edits keep both versions.
- Collapsible assistant chat using local Ollama models, with confirmed text proposals for the current page. Embedded spreadsheet editing is not yet supported. See [Ollama setup](docs/ollama.md).
- Autosave, a 30-day trash, and light/dark themes.
- A customizable cover for each notebook with a title, description, icon, favorites, and its pages.
- Notebook backup and restore, plus per-page HTML and PDF export (via the browser print dialog).

## Quick start

With Docker Desktop running:

```sh
docker compose up --build -d
```

Open **http://127.0.0.1:1420** and create an account. Docker starts PostgreSQL, the API, and the frontend with hot reload; no `.env` file or local Bun installation is needed.

```sh
docker compose logs -f backend frontend
docker compose down
```

**Do not use `docker compose down -v` unless you want to delete stored accounts and data.**

### Installable / offline web app

Use the built frontend instead of hot reload (Docker Compose 2.24.4+):

```sh
docker compose -f compose.yaml -f compose.pwa.yaml up --build -d
```

Open the same URL online first and wait for **Sincronizado**. Install from your browser menu if desired. Reopening offline requires the application download to finish (see Settings); remote hosting requires HTTPS. See [offline and attachment details](docs/offline.md).

## Development

Install [Bun](https://bun.sh), then run:

```sh
bun install
bun run dev
```

The web app requires the backend for authentication and storage. See [server/README.md](server/README.md) for backend setup and tests.

```sh
bun run typecheck
bun run test
bun run test:frontend # frontend only
bun run build
```

### Frontend structure

The frontend is organized by feature rather than flat `components/` and `lib/` folders:

```text
src/
  app/                 # App composition, global styles, PWA service worker
  features/
    assistant/         # Chat UI and assistant API
    auth/              # Sign-in / sign-up UI
    editor/            # Editor, blocks, extensions, formatting, links, toolbar
    settings/          # Preferences and backup import UI
    workspace/         # Notes/notebooks model, explorer, icons, trash, export
  infrastructure/      # Cloud API, persistence, attachments, offline sync
  shared/              # Reusable UI primitives, theme, generic utilities
  main.tsx             # Browser entry point
```

Frontend tests live separately in `tests/frontend/`, mirroring the source folders
and importing the actual modules from `src/`. Keep new tests there, not alongside
production files. Backend tests remain in `server/tests/`.

Keep feature-specific components and logic within their feature. Use `shared/`
only for domain-independent code, and `infrastructure/` for external services and
persistence. `app/` composes these modules; import modules directly rather than
adding catch-all barrel files.

### Desktop

The desktop app stores its notebook locally in SQLite. It does not sign in or sync with web accounts. Images and PDF attachments stay in the app's local web storage.

Published downloads are linked from the web sign-in screen and Settings. They come from the latest GitHub Release:

- Linux: `.deb` and AppImage
- Windows: NSIS installer
- macOS: Apple Silicon and Intel `.dmg` files

macOS and Windows may warn because the installers are not code-signed. Bump `version` in `src-tauri/tauri.conf.json`, then push a matching tag such as `v0.1.0`. The [desktop release workflow](.github/workflows/desktop-release.yml) builds and publishes the installers. A manual workflow run only builds artifacts and does not publish them.

For a local build, install Bun, Rust, and the [Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/), then run:

```sh
bun run desktop:dev
bun run desktop:build
```

Build on the target platform. Bundles are generated in `src-tauri/target/release/bundle/`.

## Stack and storage

React 19, TypeScript, Vite, Tailwind CSS 4, Tiptap, Recharts, and Univer Sheets. The backend uses Bun, Hono, Better Auth, and PostgreSQL; the desktop app uses Tauri 2 and SQLite.

Web notebook pages and attachments are stored per account in PostgreSQL, with an account-scoped IndexedDB copy for offline use. An existing local notebook is imported when an account first opens without one, keeping the local copy as a backup. Desktop notebooks remain separate and do not sync with web accounts.

Spreadsheets do not support XLSX/CSV import or export, collaboration, or chart-linked data. JSON backups include attachments and editable charts and sheets; HTML exports are static.
