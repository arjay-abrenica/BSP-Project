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

// Auto-migration for IAR 2026 Layout updates
pool.query("ALTER TABLE IAR_Records ADD COLUMN IF NOT EXISTS accepted_by_division VARCHAR(255)")
  .then(() => console.log("Database IAR_Records accepted_by_division column verified successfully."))
  .catch(err => console.error("Database migration error for IAR_Records accepted_by_division column:", err));

pool.query("ALTER TABLE IAR_Line_Items ADD COLUMN IF NOT EXISTS srp DECIMAL(15, 2) DEFAULT 0.00")
  .then(() => console.log("Database IAR_Line_Items srp column verified successfully."))
  .catch(err => console.error("Database migration error for IAR_Line_Items srp column:", err));

pool.query("ALTER TABLE IAR_Line_Items ADD COLUMN IF NOT EXISTS discount DECIMAL(15, 2) DEFAULT 0.00")
  .then(() => console.log("Database IAR_Line_Items discount column verified successfully."))
  .catch(err => console.error("Database migration error for IAR_Line_Items discount column:", err));

pool.query("ALTER TABLE IAR_Line_Items ADD COLUMN IF NOT EXISTS net_amount DECIMAL(15, 2) DEFAULT 0.00")
  .then(() => console.log("Database IAR_Line_Items net_amount column verified successfully."))
  .catch(err => console.error("Database migration error for IAR_Line_Items net_amount column:", err));

// Auto-migration: Ensure requested_by column exists in Requests
pool.query("ALTER TABLE Requests ADD COLUMN IF NOT EXISTS requested_by VARCHAR(150)")
  .then(() => console.log("Database Requests requested_by column verified successfully."))
  .catch(err => console.error("Database migration error for Requests requested_by column:", err));

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool, // Exported for transaction management (client.connect)
};