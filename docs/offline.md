# Offline use and attachments

## Getting started

Run the installable build with Docker Compose 2.24.4 or newer:

```sh
docker compose -f compose.yaml -f compose.pwa.yaml up --build -d
```

This runs migrations and serves the built app through nginx at http://127.0.0.1:1420. It uses the same database and authentication volumes as development. Do not use `down -v` to switch modes.

Alternatively, with the backend running and the development frontend stopped, run `bun run build` and `bun run preview -- --port 1420`.

1. Sign in online at least once on each browser/device.
2. Wait for **Sincronizado**: the notebook has synced and all referenced attachments have been downloaded.
3. In **Ajustes → Acceso sin conexión**, wait until the application is ready for offline opening. The initial download includes the spreadsheet engine and may take time.
4. Optionally use your browser's **Install app / Add to Home Screen** menu. Installation is not required for offline use.

Service workers require HTTPS, except on loopback addresses such as localhost/127.0.0.1. The Vite development server supports continuing to edit in an open tab, but does not install a service worker. Tauri is not changed by this feature.

## Images and PDF files

- Use **Insertar → Imagen o PDF**, paste an image from the clipboard, or drop supported files into the editor.
- PNG, JPEG, WebP and GIF appear inline. PDF files are downloadable attachments, not embedded PDF viewers.
- Limits: 10 MiB per file, 100 MiB stored files per account, and 5 MiB for notebook JSON (file bytes are stored separately).
- Offline additions are stored locally first and uploaded before publishing the notebook that references them.
- Files are private to their owner. The API checks sessions, account identity, MIME signatures and upload limits. PDF responses are downloads with `nosniff`.
- Removing a block removes its reference, not its stored bytes. Files are retained to avoid breaking trash, conflict copies and other offline devices; automatic file garbage collection is not implemented. Retained files count towards the account limit.

## Synchronization and conflicts

Edits are committed to IndexedDB on each change. A successful local save is distinct from server synchronization. The app retries when connectivity returns and checks for remote changes every 30 seconds while open; background sync while the app is closed is not implemented.

The server uses atomic revision checks to reject stale writes. Three-way merging combines changes to different notes. Competing changes to the same note keep the remote version and create a visible local **(conflicto)** copy; an edit versus a permanent deletion also preserves the edited note. Note conflicts are whole-note copies, not character-level merging. Notebook metadata merges per field; pages moved between notebooks remain attached to their selected notebook.

One editing tab per account/origin is allowed using Web Locks. Another device or browser can edit concurrently. Close the first tab before opening the same account in another tab. A recent browser with IndexedDB, Web Locks and service-worker support is required.

If a session expires, sign in again with the same account. Unsent changes remain local. Signing out offline clears automatic local access and queues server sign-out for the next launch; it cannot immediately revoke a server session without connectivity.

## Backups and privacy

JSON exports include attachment bytes and editable chart/sheet data. Importing creates new file IDs and replaces the active notebook after confirmation. HTML exports embed images and PDF download links; printing a note includes its images and PDF attachment labels, not the contents of attached PDF documents.

Local records are scoped by account; API data is never cached in the service-worker shell cache. Local copies are not encrypted and remain after signing out so pending work can be recovered after signing in again. Use trusted devices and export backups. Clearing browser storage, private browsing cleanup, OS eviction or uninstall options that delete site data can erase unsynced work. Do not close a tab while local saving reports an error.

The service worker updates when all tabs using the previous app version have closed. It caches only static application files, never authenticated API responses.

## Deployment

Deploy the database migration and backend before the frontend. `bun run server:migrate` creates `user_file` and adds the workspace revision column. The legacy `/api/workspace` endpoint rejects writes once a notebook has been saved through revision-checked sync, preventing old clients from stripping attachment blocks.

- `GET /api/sync`: `{ workspace, revision }`.
- `PUT /api/sync`: notebook JSON, `If-Match: <revision>`; returns the new revision or HTTP 409.
- `GET /api/files/:id`: attachment bytes for the authenticated owner.
- `PUT /api/files/:id`: immutable, idempotent upload with its MIME type.

Sync and file requests require `X-Notebook-User` matching the validated session user. This is an additional account-switch guard, not authentication. Mutations also require an authorized `Origin`. Keep proxies configured for 10 MiB uploads; the workspace endpoint still enforces 5 MiB. Back up both notebook and file tables.
