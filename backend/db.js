import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Ensure avatar_url column exists in users table
pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;")
  .catch((err) => console.error("Error ensuring avatar_url column:", err.message));

export default pool;