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

// Auto-migration for PAR and ICS custom fields
const parIcsQueries = [
  "ALTER TABLE IAR_Line_Items ADD COLUMN IF NOT EXISTS estimated_useful_life VARCHAR(100)",
  "ALTER TABLE Property_Items ADD COLUMN IF NOT EXISTS estimated_useful_life VARCHAR(100)",
  "ALTER TABLE Property_Items ADD COLUMN IF NOT EXISTS receiver_designation VARCHAR(255)",
  "ALTER TABLE Property_Items ADD COLUMN IF NOT EXISTS issuer_name VARCHAR(255) DEFAULT 'JERRY B. RUBRICO'",
  "ALTER TABLE Property_Items ADD COLUMN IF NOT EXISTS issuer_designation VARCHAR(255)",
  "ALTER TABLE Property_Items ADD COLUMN IF NOT EXISTS issuer_office VARCHAR(255)",
  "ALTER TABLE IAR_Line_Items ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '[]'::jsonb",
  "ALTER TABLE Property_Items ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '[]'::jsonb"
];

parIcsQueries.forEach(q => {
  pool.query(q).catch(err => console.error("Database migration error for PAR/ICS column:", err));
});

// Auto-migration: Employees table
const employeeMigrationQuery = `
CREATE TABLE IF NOT EXISTS Employees (
    employee_id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    designation VARCHAR(255),
    office_id INT,
    status VARCHAR(50) DEFAULT 'ACTIVE'
);
`;

pool.query(employeeMigrationQuery)
  .then(() => {
    console.log("Database Employees table verified successfully.");
    return pool.query('SELECT COUNT(*) FROM Employees');
  })
  .then(res => {
    if (res && res.rows[0].count === '0') {
      const insertDefaultEmployees = `
        INSERT INTO Employees (full_name, designation, office_id, status) VALUES
        ('JERRY B. RUBRICO', 'Bank Officer VI', NULL, 'ACTIVE'),
        ('JHON DOE', 'Bank Officer I', NULL, 'ACTIVE'),
        ('JANE SMITH', 'Supply Officer', NULL, 'ACTIVE')
      `;
      return pool.query(insertDefaultEmployees).then(() => console.log("Default employees inserted."));
    }
  })
  .catch(err => console.error("Database migration error for Employees table:", err));

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool, // Exported for transaction management (client.connect)
};