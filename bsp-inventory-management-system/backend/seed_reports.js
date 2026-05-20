const db = require('./db');

const seedData = async () => {
  try {
    await db.query('BEGIN');

    // 1. Categories
    const categories = ['TAPES', 'PAPER PRODUCTS', 'OFFICE SUPPLIES', 'CLEANING AGENTS'];
    for (const cat of categories) {
      // Check if exists first since no UNIQUE constraint
      const checkCat = await db.query('SELECT category_id FROM Categories WHERE category_name = $1', [cat]);
      if (checkCat.rows.length === 0) {
        await db.query('INSERT INTO Categories (category_name) VALUES ($1)', [cat]);
      }
    }

    // 2. Items & Initial Stock
    const items = [
      { name: 'DUCT TAPE', cat: 'TAPES', unit: 'ROLL', price: 98.0, stock: 3 },
      { name: 'SCOTCH TAPE TRANSPARENT', cat: 'TAPES', unit: 'ROLL', price: 12.0, stock: 281 },
      { name: 'MASKING TAPE', cat: 'TAPES', unit: 'ROLL', price: 36.0, stock: 2 },
      { name: 'PAPER, MULTICOPY, LEGAL', cat: 'PAPER PRODUCTS', unit: 'RMS', price: 210.0, stock: 50 },
      { name: 'TISSUE PAPER', cat: 'PAPER PRODUCTS', unit: 'ROLLS', price: 15.0, stock: 100 },
      { name: 'BALLPEN, RED', cat: 'OFFICE SUPPLIES', unit: 'PCS', price: 8.0, stock: 24 }
    ];

    for (const item of items) {
      // Check if exists
      const checkItem = await db.query('SELECT item_id FROM Items WHERE item_name = $1', [item.name]);
      if (checkItem.rows.length > 0) continue;

      const catRes = await db.query('SELECT category_id FROM Categories WHERE category_name = $1', [item.cat]);
      const catId = catRes.rows[0].category_id;
      
      const itemCode = 'ITM-' + Math.random().toString(36).substr(2, 6).toUpperCase();
      const itemRes = await db.query(
        `INSERT INTO Items (item_name, unit_of_measure, unit_price, category_id, current_stock, item_code) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING item_id`,
        [item.name, item.unit, item.price, catId, item.stock, itemCode]
      );
      const itemId = itemRes.rows[0].item_id;

      // Create an 'IN' transaction for initial stock
      const transRes = await db.query(
        "INSERT INTO Transactions (transaction_type, transaction_date, remarks) VALUES ('IN', '2024-12-31', 'INITIAL STOCK') RETURNING transaction_id"
      );
      await db.query(
        "INSERT INTO Transaction_Details (transaction_id, item_id, quantity, unit_cost) VALUES ($1, $2, $3, $4)",
        [transRes.rows[0].transaction_id, itemId, item.stock, item.price]
      );
    }

    // 3. Some January Issuances (RSMI)
    const issuances = [
      { ris: '25-01-0001', office: 'CPSMO', item: 'PAPER, MULTICOPY, LEGAL', qty: 4, date: '2025-01-15' },
      { ris: '25-01-0002', office: 'OSG', item: 'BALLPEN, RED', qty: 3, date: '2025-01-20' }
    ];

    for (const iss of issuances) {
      // Check if RIS already exists
      const checkRis = await db.query('SELECT transaction_id FROM Transactions WHERE ris_no = $1', [iss.ris]);
      if (checkRis.rows.length > 0) continue;

      const offRes = await db.query('SELECT office_id FROM Offices WHERE acronym = $1', [iss.office]);
      const offId = offRes.rows[0]?.office_id || 1;
      const itemRes = await db.query('SELECT item_id, unit_price FROM Items WHERE item_name = $1', [iss.item]);
      const item = itemRes.rows[0];

      const transRes = await db.query(
        "INSERT INTO Transactions (ris_no, transaction_type, transaction_date, office_id, remarks) VALUES ($1, 'OUT', $2, $3, 'MONTHLY ISSUANCE') RETURNING transaction_id",
        [iss.ris, iss.date, offId]
      );
      const transId = transRes.rows[0].transaction_id;

      await db.query(
        "INSERT INTO Transaction_Details (transaction_id, item_id, quantity, unit_cost) VALUES ($1, $2, $3, $4)",
        [transId, item.item_id, iss.qty, item.unit_price]
      );

      // Deduct stock
      await db.query("UPDATE Items SET current_stock = current_stock - $1 WHERE item_id = $2", [iss.qty, item.item_id]);
    }

    await db.query('COMMIT');
    console.log('Seed data inserted successfully');
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Error seeding data:', err);
  } finally {
    process.exit();
  }
};

seedData();
