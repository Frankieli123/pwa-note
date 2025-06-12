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
    CREATE TABLE IF NOT EXISTS notes (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
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
  `)

  await pool.end()
  console.log("Migration completed successfully")
}

main().catch((e) => {
  console.error("Migration failed")
  console.error(e)
  process.exit(1)
})
