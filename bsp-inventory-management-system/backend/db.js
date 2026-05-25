const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Auto-migration: Ensure status column exists in Generated_Reports
pool.query("ALTER TABLE Generated_Reports ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE'")
  .then(() => console.log("Database Generated_Reports status column verified successfully."))
  .catch(err => console.error("Database migration error for Generated_Reports status column:", err));

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool, // Exported for transaction management (client.connect)
};