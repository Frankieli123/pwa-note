import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

// This script should be run separately to set up the database
async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  const db = drizzle(pool)

  // Create tables if they don't exist
  await db.execute(`
    CREATE TABLE IF NOT EXISTS groups (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      name TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notes (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS links (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS files (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(100) NOT NULL,
      url TEXT NOT NULL,
      thumbnail TEXT,
      size INTEGER NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- Add status column if it doesn't exist (for existing databases)
    ALTER TABLE files ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';

    -- Add base64_data column for Base64 file storage (nullable for backward compatibility)
    ALTER TABLE files ADD COLUMN IF NOT EXISTS base64_data TEXT;
    ALTER TABLE groups ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();
    ALTER TABLE groups ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();
    ALTER TABLE notes ADD COLUMN IF NOT EXISTS group_id INTEGER;
    ALTER TABLE notes ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'notes_group_id_fkey'
      ) THEN
        ALTER TABLE notes
          ADD CONSTRAINT notes_group_id_fkey
          FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL;
      END IF;
    END $$;
  `)

  await pool.end()
  console.log("Migration completed successfully")
}

main().catch((e) => {
  console.error("Migration failed")
  console.error(e)
  process.exit(1)
})
