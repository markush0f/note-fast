# ntbk

A digital notebook with rich-text pages, nested folders, and cloud sync for web accounts. The interface is currently in Spanish. The Tauri desktop app stores its notebook locally and does not yet support accounts or sync.

## Features

- Rich-text pages with formatting, task lists, code blocks, and links between pages.
- Nested folders, drag-and-drop organization, favorites, and full-text search.
- Embedded charts and spreadsheets with formulas and multiple sheets.
- Inline images and downloadable PDF attachments (10 MiB per file, 100 MiB per account).
- Installable web app with offline editing and automatic sync; conflicting page edits keep both versions.
- Autosave, a 30-day trash, and light/dark themes.
- A customizable notebook cover with a title, description, icon, favorites, recently edited pages, and folder shortcuts.
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
bun run build
```

### Desktop

Requires Bun, Rust, and the [Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/).

```sh
bun run desktop:dev
bun run desktop:build
```

Build on the target platform. Bundles are generated in `src-tauri/target/release/bundle/`.

## Stack and storage

React 19, TypeScript, Vite, Tailwind CSS 4, Tiptap, Recharts, and Univer Sheets. The backend uses Bun, Hono, Better Auth, and PostgreSQL; the desktop app uses Tauri 2 and SQLite.

Web notebook pages and attachments are stored per account in PostgreSQL, with an account-scoped IndexedDB copy for offline use. An existing local notebook is imported when an account first opens without one, keeping the local copy as a backup. Desktop notebooks remain separate and do not sync with web accounts.

Spreadsheets do not support XLSX/CSV import or export, collaboration, or chart-linked data. JSON backups include attachments and editable charts and sheets; HTML exports are static.
