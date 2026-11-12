import type { Pool } from 'pg'

export async function migrateNotebook(database: Pick<Pool, 'query'>) {
  await database.query(`
    CREATE TABLE IF NOT EXISTS user_workspace (
      user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE user_workspace ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 0;
    CREATE TABLE IF NOT EXISTS user_file (
      user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      id TEXT NOT NULL,
      media_type TEXT NOT NULL,
      content BYTEA NOT NULL,
      PRIMARY KEY (user_id, id)
    );
  `)
}
