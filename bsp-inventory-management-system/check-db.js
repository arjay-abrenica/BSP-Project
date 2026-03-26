const db = require('./backend/db');

async function checkData() {
  try {
    const offices = await db.query('SELECT * FROM Offices');
    console.log('--- OFFICES ---');
    console.table(offices.rows);

    const transactions = await db.query(`
      SELECT t.transaction_id, t.ris_no, t.office_id, o.acronym 
      FROM Transactions t 
      JOIN Offices o ON t.office_id = o.office_id 
      WHERE t.transaction_type = 'OUT'
    `);
    console.log('--- OUT TRANSACTIONS ---');
    console.table(transactions.rows);

    const requests = await db.query(`
      SELECT r.request_id, r.office_id, r.status, o.acronym 
      FROM Requests r 
      JOIN Offices o ON r.office_id = o.office_id
    `);
    console.log('--- REQUESTS ---');
    console.table(requests.rows);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkData();