import pg from "pg";

const { Pool } = pg;

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    })
  : null;

export function getDatabasePool() {
  return pool;
}

export async function checkDatabaseConnection() {
  if (!pool) {
    return { configured: false, connected: false };
  }

  await pool.query("SELECT 1");
  return { configured: true, connected: true };
}

export async function closeDatabasePool() {
  if (pool) {
    await pool.end();
  }
}
