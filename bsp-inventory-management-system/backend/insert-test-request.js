require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function createTestRequest() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get an office (e.g., IA)
    const officeRes = await client.query("SELECT office_id FROM Offices WHERE acronym = 'IA' LIMIT 1");
    if (officeRes.rows.length === 0) throw new Error("IA office not found. Please ensure seed data exists.");
    const officeId = officeRes.rows[0].office_id;

    // 2. Get some items
    const itemsRes = await client.query("SELECT item_id FROM Items LIMIT 2");
    if (itemsRes.rows.length < 2) throw new Error("Not enough items in database.");
    
    const requestNumber = `REQ-TEST-${Date.now().toString().slice(-4)}`;

    // 3. Insert Request Header
    const reqRes = await client.query(
      "INSERT INTO Requests (office_id, request_number, request_date, purpose, status) VALUES ($1, $2, CURRENT_DATE, $3, 'PENDING') RETURNING request_id",
      [officeId, requestNumber, 'TESTING APPROVE/REJECT WORKFLOW']
    );
    const requestId = reqRes.rows[0].request_id;

    // 4. Insert Request Details
    for (const item of itemsRes.rows) {
      await client.query(
        "INSERT INTO Request_Details (request_id, item_id, quantity) VALUES ($1, $2, $3)",
        [requestId, item.item_id, 5]
      );
    }

    await client.query('COMMIT');
    console.log(`Successfully created PENDING request: ${requestNumber} (ID: ${requestId})`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating test request:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

createTestRequest();