import "dotenv/config";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { getDatabasePool, closeDatabasePool } from "../config/database.js";

const migrationVersion = "001_initial_schema";
const migrationPath = new URL("../../db/migrations/001_initial_schema.sql", import.meta.url);

async function runMigration() {
  const pool = getDatabasePool();

  if (!pool) {
    throw new Error("DATABASE_URL is missing. Configure it in backend/.env before running migrations.");
  }

  const sql = await readFile(fileURLToPath(migrationPath), "utf8");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(120) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const existing = await pool.query(
    "SELECT version FROM schema_migrations WHERE version = $1",
    [migrationVersion],
  );

  if (existing.rowCount > 0) {
    console.log(`Migration already applied: ${migrationVersion}`);
    return;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query(
      "INSERT INTO schema_migrations (version) VALUES ($1)",
      [migrationVersion],
    );
    await client.query("COMMIT");
    console.log(`Migration applied successfully: ${migrationVersion}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

try {
  await runMigration();
} catch (error) {
  console.error("Database migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await closeDatabasePool();
}
