require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function checkData() {
  try {
    const offices = await pool.query('SELECT * FROM Offices');
    console.log('--- OFFICES ---');
    console.table(offices.rows);

    const transactions = await pool.query(`
      SELECT t.transaction_id, t.ris_no, t.office_id, o.acronym 
      FROM Transactions t 
      JOIN Offices o ON t.office_id = o.office_id 
      WHERE t.transaction_type = 'OUT'
    `);
    console.log('--- OUT TRANSACTIONS ---');
    console.table(transactions.rows);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkData();