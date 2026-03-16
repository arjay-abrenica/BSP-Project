const db = require('./db');

/* =========================================
   SECTION 1: ITEM MANAGEMENT (CRUD)
   ========================================= */

exports.getAllItems = async (req, res) => {
  try {
    const query = `
      SELECT i.*, c.category_name, s.supplier_name 
      FROM Items i
      LEFT JOIN Categories c ON i.category_id = c.category_id
      LEFT JOIN Suppliers s ON i.supplier_id = s.supplier_id
      ORDER BY i.item_id ASC
    `;
    const result = await db.query(query);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createItem = async (req, res) => {
  if (!req.body) return res.status(400).json({ error: "Request body missing or not JSON" });
  
  const itemsToCreate = Array.isArray(req.body) ? req.body : [req.body];
  let client;
  
  try {
    client = await db.pool.connect();
    await client.query('BEGIN');

    const createdItems = [];

    for (const item of itemsToCreate) {
      const { item_code, item_name, description, unit_of_measure, unit_price, category_id, supplier_name, reorder_level, quantity, delivery_number } = item;

      let final_supplier_id = null;
      if (supplier_name && supplier_name.trim() !== '') {
        const supRes = await client.query('SELECT supplier_id FROM Suppliers WHERE supplier_name ILIKE $1', [supplier_name.trim()]);
        if (supRes.rows.length > 0) {
          final_supplier_id = supRes.rows[0].supplier_id;
        } else {
          const newSup = await client.query('INSERT INTO Suppliers (supplier_name) VALUES ($1) RETURNING supplier_id', [supplier_name.trim()]);
          final_supplier_id = newSup.rows[0].supplier_id;
        }
      }

      // 1. Insert Item
      const result = await client.query(
        `INSERT INTO Items (item_code, item_name, description, unit_of_measure, unit_price, category_id, supplier_id, reorder_level, current_stock) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [item_code, item_name, description, unit_of_measure, unit_price, category_id || null, final_supplier_id, reorder_level || 10, quantity || 0]
      );
      
      const newItem = result.rows[0];

      // 2. If quantity > 0, create a Transaction IN
      if (quantity > 0) {
        const transRes = await client.query(
          `INSERT INTO Transactions (transaction_type, transaction_date, remarks) 
           VALUES ('IN', CURRENT_DATE, $1) RETURNING transaction_id`,
          [`Initial Stock. Delivery No: ${delivery_number || 'N/A'}`]
        );
        const transactionId = transRes.rows[0].transaction_id;

        await client.query(
          `INSERT INTO Transaction_Details (transaction_id, item_id, quantity, unit_cost) 
           VALUES ($1, $2, $3, $4)`,
          [transactionId, newItem.item_id, quantity, unit_price || 0]
        );
      }
      createdItems.push(newItem);
    }

    await client.query('COMMIT');
    res.status(201).json(Array.isArray(req.body) ? createdItems : createdItems[0]);
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    if (client) client.release();
  }
};

exports.updateItem = async (req, res) => {
  if (!req.body) return res.status(400).json({ error: "Request body missing or not JSON" });
  const { id } = req.params;
  const { item_code, item_name, description, unit_of_measure, unit_price, category_id, supplier_id, reorder_level } = req.body;
  try {
    const result = await db.query(
      `UPDATE Items 
       SET item_code = $1, item_name = $2, description = $3, unit_of_measure = $4, unit_price = $5, category_id = $6, supplier_id = $7, reorder_level = $8
       WHERE item_id = $9 RETURNING *`,
      [item_code, item_name, description, unit_of_measure, unit_price, category_id, supplier_id, reorder_level, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Item not found' });
    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteItem = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM Items WHERE item_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Item not found' });
    res.status(200).json({ message: 'Item deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* =========================================
   SECTION 2: STOCK TRANSACTIONS (IN/Restock)
   ========================================= */

exports.restockItems = async (req, res) => {
  // Validation: Ensure body exists
  if (!req.body) {
    return res.status(400).json({
      error: "Request body is missing or not in JSON format.",
      tip: "In Postman, ensure the Body is set to 'raw' and the type is 'JSON', then provide a valid JSON object."
    });
  }

  // Expected body: { transaction_date, remarks, items: [{ item_id, quantity, unit_cost }] }
  const { transaction_date, remarks, items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Request must include a non-empty 'items' array." });
  }

  let client;

  try {
    client = await db.pool.connect();
    await client.query('BEGIN');
    
    // 1. Create Transaction Header
    const transRes = await client.query(
      `INSERT INTO Transactions (transaction_type, transaction_date, remarks) 
       VALUES ('IN', $1, $2) RETURNING transaction_id`,
      [transaction_date || new Date(), remarks]
    );
    const transactionId = transRes.rows[0].transaction_id;

    // 2. Insert Details & Update Stock
    for (const item of items) {
      await client.query(
        `INSERT INTO Transaction_Details (transaction_id, item_id, quantity, unit_cost) 
         VALUES ($1, $2, $3, $4)`,
        [transactionId, item.item_id, item.quantity, item.unit_cost]
      );
      
      await client.query(
        `UPDATE Items SET current_stock = current_stock + $1 WHERE item_id = $2`,
        [item.quantity, item.item_id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Stock added successfully', transaction_id: transactionId });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    if (client) client.release();
  }
};

/* =========================================
   SECTION 3: ISSUANCE TRANSACTIONS (OUT/Issue)
   ========================================= */

exports.issueItems = async (req, res) => {
  // Validation: Ensure body exists
  if (!req.body) {
    return res.status(400).json({
      error: "Request body is missing or not in JSON format.",
      tip: "In Postman, ensure the Body is set to 'raw' and the type is 'JSON', then provide a valid JSON object."
    });
  }

  // Expected body: { ris_no, department_id, transaction_date, remarks, items: [{ item_id, quantity }] }
  const { ris_no, department_id, transaction_date, remarks, items } = req.body;
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Request must include a non-empty 'items' array." });
  }

  let client;

  try {
    client = await db.pool.connect();
    await client.query('BEGIN');

    // 1. Create Transaction Header
    const transRes = await client.query(
      `INSERT INTO Transactions (ris_no, transaction_type, transaction_date, department_id, remarks) 
       VALUES ($1, 'OUT', $2, $3, $4) RETURNING transaction_id`,
      [ris_no, transaction_date || new Date(), department_id, remarks]
    );
    const transactionId = transRes.rows[0].transaction_id;

    // 2. Process Items
    for (const item of items) {
      // Check stock
      const stockCheck = await client.query('SELECT current_stock FROM Items WHERE item_id = $1', [item.item_id]);
      if (stockCheck.rows.length === 0) throw new Error(`Item ${item.item_id} not found`);
      if (stockCheck.rows[0].current_stock < item.quantity) {
        throw new Error(`Insufficient stock for item ID ${item.item_id}`);
      }

      // Insert Detail
      await client.query(
        `INSERT INTO Transaction_Details (transaction_id, item_id, quantity) 
         VALUES ($1, $2, $3)`,
        [transactionId, item.item_id, item.quantity]
      );
      
      // Deduct Stock
      await client.query(
        `UPDATE Items SET current_stock = current_stock - $1 WHERE item_id = $2`,
        [item.quantity, item.item_id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Issuance recorded successfully', transaction_id: transactionId });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    if (client) client.release();
  }
};

/* =========================================
   SECTION 4: SCANNING & LOOKUPS
   ========================================= */

exports.getItemByCode = async (req, res) => {
  const { code } = req.params;
  try {
    const result = await db.query('SELECT * FROM Items WHERE item_code = $1', [code]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Item not found' });
    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTransactionByRis = async (req, res) => {
  const { ris_no } = req.params;
  try {
    const result = await db.query(
      `SELECT t.*, d.department_name, 
              td.item_id, i.item_name, td.quantity 
       FROM Transactions t
       LEFT JOIN Departments d ON t.department_id = d.department_id
       LEFT JOIN Transaction_Details td ON t.transaction_id = td.transaction_id
       LEFT JOIN Items i ON td.item_id = i.item_id
       WHERE t.ris_no = $1`, 
      [ris_no]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'RIS number not found' });
    
    // Group details if multiple rows returned
    const transaction = {
      ...result.rows[0],
      details: result.rows.map(row => ({
        item_id: row.item_id,
        item_name: row.item_name,
        quantity: row.quantity
      }))
    };
    
    // Cleanup duplicate top-level fields
    delete transaction.item_id;
    delete transaction.item_name;
    delete transaction.quantity;

    res.status(200).json(transaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* =========================================
   SECTION 5: AUTHENTICATION (Login/Register)
   ========================================= */

exports.registerUser = async (req, res) => {
  // Simple registration logic
  const { username, password, role } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    // Check if user exists
    const checkUser = await db.query('SELECT * FROM Users WHERE username = $1', [username]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Insert new user
    const result = await db.query(
      'INSERT INTO Users (username, password, role) VALUES ($1, $2, $3) RETURNING user_id, username, role',
      [username, password, role || 'staff'] 
    );
    res.status(201).json({ message: 'User registered successfully', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.loginUser = async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await db.query('SELECT * FROM Users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = result.rows[0];
    // Direct comparison for Phase 1 (TODO: Use bcrypt for hashing in Phase 3)
    if (user.password !== password) return res.status(401).json({ error: 'Invalid credentials' });

    res.status(200).json({ message: 'Login successful', user: { id: user.user_id, username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};