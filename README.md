# ntbk

A note-taking app with rich-text editing, nested folders, and cloud sync for web accounts. The interface is currently in Spanish. The Tauri desktop app uses local storage and does not yet support accounts or sync.

## Features

- Rich-text notes with formatting, task lists, code blocks, and links between notes.
- Nested folders, drag-and-drop organization, favorites, and full-text search.
- Embedded charts and spreadsheets with formulas and multiple sheets.
- Autosave, a 30-day trash, and light/dark themes.
- JSON backup and restore, plus per-note HTML and PDF export (via the browser print dialog).

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

Web notebooks are stored per account in PostgreSQL. An existing local IndexedDB notebook is imported when an account first opens without a notebook, keeping the local copy as a backup. Desktop notebooks remain separate and do not sync with web accounts.

Spreadsheets do not support XLSX/CSV import or export, collaboration, or chart-linked data. JSON backups preserve editable charts and sheets; HTML exports are static.
