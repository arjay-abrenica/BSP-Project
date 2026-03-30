const db = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/* =========================================
   SECTION 1: ITEM MANAGEMENT (CRUD)
   ========================================= */

exports.getAllOffices = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM Offices ORDER BY office_name ASC');
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

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
      const { item_code, item_name, description, unit_of_measure, unit_price, category_id, supplier_name, reorder_level, quantity, delivery_number, delivery_receipt } = item;

      let final_supplier_id = null;
      if (supplier_name && supplier_name.trim() !== '') {
        const supNameUpper = supplier_name.trim().toUpperCase();
        const supRes = await client.query('SELECT supplier_id FROM Suppliers WHERE supplier_name = $1', [supNameUpper]);
        if (supRes.rows.length > 0) {
          final_supplier_id = supRes.rows[0].supplier_id;
        } else {
          const newSup = await client.query('INSERT INTO Suppliers (supplier_name) VALUES ($1) RETURNING supplier_id', [supNameUpper]);
          final_supplier_id = newSup.rows[0].supplier_id;
        }
      }

      // 1. Check if item with this SKU already exists
      let itemToUpdate = null;
      if (item_code && item_code.trim() !== '') {
        const skuToSearch = item_code.trim().toUpperCase();
        const existingItemRes = await client.query('SELECT * FROM Items WHERE TRIM(UPPER(item_code)) = $1', [skuToSearch]);
        if (existingItemRes.rows.length > 0) {
          itemToUpdate = existingItemRes.rows[0];
        }
      }

      let newItem;
      if (itemToUpdate) {
        // Update existing item
        const updateRes = await client.query(
          `UPDATE Items 
           SET item_name = COALESCE($1, item_name), 
               description = COALESCE($2, description), 
               unit_of_measure = COALESCE($3, unit_of_measure), 
               unit_price = COALESCE($4, unit_price), 
               category_id = COALESCE($5, category_id), 
               supplier_id = COALESCE($6, supplier_id), 
               reorder_level = COALESCE($7, reorder_level),
               current_stock = current_stock + $8
           WHERE item_id = $9 RETURNING *`,
          [
            item_name ? item_name.toUpperCase() : null,
            description ? description.toUpperCase() : null,
            unit_of_measure ? unit_of_measure.toUpperCase() : null,
            unit_price,
            category_id || null,
            final_supplier_id,
            reorder_level || 10,
            quantity || 0,
            itemToUpdate.item_id
          ]
        );
        newItem = updateRes.rows[0];
      } else {
        // Insert New Item
        const result = await client.query(
          `INSERT INTO Items (item_code, item_name, description, unit_of_measure, unit_price, category_id, supplier_id, reorder_level, current_stock) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
          [
            item_code ? item_code.toUpperCase() : null,
            item_name ? item_name.toUpperCase() : null,
            description ? description.toUpperCase() : null,
            unit_of_measure ? unit_of_measure.toUpperCase() : null,
            unit_price,
            category_id || null,
            final_supplier_id,
            reorder_level || 10,
            quantity || 0
          ]
        );
        newItem = result.rows[0];
      }

      // 2. If quantity > 0, create a Transaction IN
      if (quantity > 0) {
        const transRes = await client.query(
          `INSERT INTO Transactions (transaction_type, transaction_date, delivery_number, delivery_receipt, remarks) 
           VALUES ('IN', CURRENT_DATE, $1, $2, $3) RETURNING transaction_id`,
          [
            delivery_number ? delivery_number.toUpperCase() : null,
            delivery_receipt || null,
            'INITIAL STOCK'
          ]
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
      [
        item_code ? item_code.toUpperCase() : null,
        item_name ? item_name.toUpperCase() : null,
        description ? description.toUpperCase() : null,
        unit_of_measure ? unit_of_measure.toUpperCase() : null,
        unit_price,
        category_id,
        supplier_id,
        reorder_level,
        id
      ]
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

  // Expected body: { transaction_date, remarks, delivery_number, delivery_receipt, items: [{ item_id, quantity, unit_cost }] }
  const { transaction_date, remarks, delivery_number, delivery_receipt, items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Request must include a non-empty 'items' array." });
  }

  let client;

  try {
    client = await db.pool.connect();
    await client.query('BEGIN');

    // 1. Create Transaction Header
    const transRes = await client.query(
      `INSERT INTO Transactions (transaction_type, transaction_date, delivery_number, delivery_receipt, remarks) 
       VALUES ('IN', $1, $2, $3, $4) RETURNING transaction_id`,
      [
        transaction_date || new Date(),
        delivery_number ? delivery_number.toUpperCase() : null,
        delivery_receipt || null,
        remarks ? remarks.toUpperCase() : null
      ]
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

exports.getNextRisNo = async (req, res) => {
  const { officeId } = req.params;
  try {
    // 1. Get the office acronym
    const officeRes = await db.query('SELECT acronym FROM Offices WHERE office_id = $1', [officeId]);
    if (officeRes.rows.length === 0) {
      return res.status(404).json({ error: 'Office not found' });
    }
    const acronym = officeRes.rows[0].acronym || 'OSG'; 

    // 2. Format Date
    const today = new Date();
    const YYYY = today.getFullYear();
    const MM = String(today.getMonth() + 1).padStart(2, '0');
    const DD = String(today.getDate()).padStart(2, '0');
    
    // We'll search for today's transactions to find the next number
    const risPrefix = `${acronym}-${YYYY}-${MM}-${DD}`;

    // 3. Find latest sequence number for today for THIS specific acronym
    const latestRisRes = await db.query(
      `SELECT ris_no FROM Transactions 
       WHERE ris_no LIKE $1 
       ORDER BY transaction_id DESC LIMIT 1`,
      [`${acronym}-${YYYY}-${MM}-${DD}-%`]
    );

    let nextSequence = 1;
    if (latestRisRes.rows.length > 0) {
      const lastRis = latestRisRes.rows[0].ris_no;
      const parts = lastRis.split('-');
      const lastSeqStr = parts[parts.length - 1];
      const lastSeq = parseInt(lastSeqStr, 10);
      if (!isNaN(lastSeq)) {
        nextSequence = lastSeq + 1;
      }
    }

    const nextRis = `${risPrefix}-${String(nextSequence).padStart(2, '0')}`;
    res.status(200).json({ nextRis });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

  // Expected body: { ris_no, office_id, received_by, transaction_date, remarks, items: [{ item_id, quantity }], request_id }
  const { ris_no, office_id, received_by, transaction_date, remarks, items, request_id } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Request must include a non-empty 'items' array." });
  }

  let client;

  try {
    client = await db.pool.connect();
    await client.query('BEGIN');

    // 1. Create Transaction Header
    const transRes = await client.query(
      `INSERT INTO Transactions (ris_no, transaction_type, transaction_date, office_id, received_by, remarks, request_id) 
       VALUES ($1, 'OUT', $2, $3, $4, $5, $6) RETURNING transaction_id`,
      [
        ris_no ? ris_no.toUpperCase() : null,
        transaction_date || new Date(),
        office_id,
        received_by ? received_by.toUpperCase() : null,
        remarks ? remarks.toUpperCase() : null,
        request_id || null
      ]
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

    // 3. If it was from a Request, update the request status
    if (request_id) {
      await client.query(
        `UPDATE Requests SET status = 'APPROVED' WHERE request_id = $1`,
        [request_id]
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
      `SELECT t.*, o.office_name, 
              td.item_id, i.item_name, i.unit_of_measure, td.quantity 
       FROM Transactions t
       LEFT JOIN Offices o ON t.office_id = o.office_id
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
        unit_of_measure: row.unit_of_measure,
        quantity: row.quantity
      }))
    };

    // Cleanup duplicate top-level fields
    delete transaction.item_id;
    delete transaction.item_name;
    delete transaction.unit_of_measure;
    delete transaction.quantity;

    res.status(200).json(transaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* =========================================
   SECTION 6: HISTORY & ACTIVITY LOG
   ========================================= */

exports.getPendingRequests = async (req, res) => {
  try {
    const query = `
      SELECT 
        r.request_id as id,
        r.request_number as "reqNumber",
        r.request_number as "reqDisplay",
        r.purpose,
        r.office_id as department_id,
        o.office_name as "deptName",
        o.office_name,
        o.acronym,
        o.dept_code as "deptCode",
        TO_CHAR(r.request_date, 'Month DD, YYYY') as date,
        (SELECT COUNT(*) FROM Request_Details rd WHERE rd.request_id = r.request_id) as "itemsCount"
      FROM Requests r
      JOIN Offices o ON r.office_id = o.office_id
      WHERE r.status = 'PENDING'
      ORDER BY r.request_date DESC
    `;
    const result = await db.query(query);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getApprovedRequests = async (req, res) => {
  try {
    const query = `
      SELECT 
        t.transaction_id as id,
        t.office_id,
        COALESCE(r.request_number, 'DIRECT') as "reqNumber",
        t.ris_no as "risNo",
        o.office_name as "deptName",
        o.acronym,
        o.dept_code as "deptCode",
        TO_CHAR(t.transaction_date, 'Month DD, YYYY') as date,
        TO_CHAR(t.transaction_date, 'HH:MI AM') as time,
        (SELECT COUNT(*) FROM Transaction_Details td WHERE td.transaction_id = t.transaction_id) as "itemsCount",
        COALESCE(r.purpose, t.remarks) as purpose,
        t.remarks,
        t.transaction_id
      FROM Transactions t
      LEFT JOIN Requests r ON t.request_id = r.request_id
      JOIN Offices o ON t.office_id = o.office_id
      WHERE t.transaction_type = 'OUT'
      ORDER BY t.transaction_date DESC, t.transaction_id DESC
    `;
    const result = await db.query(query);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRequestDetails = async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT 
        rd.item_id,
        rd.quantity as "reqQty",
        i.item_name as description,
        i.unit_of_measure as unit,
        i.current_stock as "inStock"
      FROM Request_Details rd
      JOIN Items i ON rd.item_id = i.item_id
      WHERE rd.request_id = $1
    `;
    const result = await db.query(query, [id]);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.rejectRequest = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      "UPDATE Requests SET status = 'REJECTED' WHERE request_id = $1 RETURNING *",
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    res.status(200).json({ message: 'Request rejected successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRequestsHistory = async (req, res) => {
  try {
    const query = `
      SELECT 
        t.ris_no as "risNo",
        COALESCE(o.office_name, 'UNKNOWN OFFICE') as "requestingOffice",
        TO_CHAR(t.transaction_date, 'MM/DD/YYYY') as "dateRequested",
        TO_CHAR(t.transaction_date, 'MM/DD/YYYY') as "dateReleased",
        (SELECT COALESCE(SUM(quantity), 0) FROM Transaction_Details td WHERE td.transaction_id = t.transaction_id) as "noOfItems",
        'RELEASED' as status
      FROM Transactions t
      LEFT JOIN Offices o ON t.office_id = o.office_id
      WHERE t.transaction_type = 'OUT'
      ORDER BY t.transaction_date DESC, t.transaction_id DESC
    `;
    const result = await db.query(query);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getActivityLog = async (req, res) => {
  try {
    const query = `
      SELECT 
        'ALOG-' || TO_CHAR(t.transaction_date, 'YYYY') || '-' || LPAD(t.transaction_id::text, 3, '0') as "activityLogId",
        TO_CHAR(t.transaction_date, 'MM/DD/YYYY') || ' 09:00 AM' as timestamp,
        COALESCE(o.office_name, '-') as office,
        'SYSTEM' as role,
        CASE 
          WHEN t.transaction_type = 'IN' THEN 'ADDED NEW STOCK DELIVERY' 
          ELSE 'APPROVED SUPPLY REQUEST' 
        END as activity,
        t.remarks as details
      FROM Transactions t
      LEFT JOIN Offices o ON t.office_id = o.office_id
      ORDER BY t.transaction_date DESC, t.transaction_id DESC
    `;
    const result = await db.query(query);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getLatestIntakeForItem = async (req, res) => {
  const { id } = req.params;
  try {
    // Find the latest IN transaction for this item
    const transQuery = `
      SELECT t.transaction_id, t.transaction_date, t.remarks 
      FROM Transactions t
      JOIN Transaction_Details td ON t.transaction_id = td.transaction_id
      WHERE t.transaction_type = 'IN' AND td.item_id = $1
      ORDER BY t.transaction_date DESC, t.transaction_id DESC
      LIMIT 1
    `;
    const transResult = await db.query(transQuery, [id]);

    if (transResult.rows.length === 0) {
      return res.status(404).json({ message: 'No intake history found for this item' });
    }

    const transactionId = transResult.rows[0].transaction_id;
    const transactionDate = transResult.rows[0].transaction_date;
    const remarks = transResult.rows[0].remarks;

    // Get all items in this transaction
    const detailsQuery = `
      SELECT 
        i.item_code as sku,
        i.item_name as name,
        c.category_name as category,
        i.unit_of_measure as unit,
        td.quantity as qty,
        td.unit_cost as "unitCost",
        (td.quantity * td.unit_cost) as "totalCost",
        'Existing' as status,
        s.supplier_name
      FROM Transaction_Details td
      JOIN Items i ON td.item_id = i.item_id
      LEFT JOIN Categories c ON i.category_id = c.category_id
      LEFT JOIN Suppliers s ON i.supplier_id = s.supplier_id
      WHERE td.transaction_id = $1
    `;
    const detailsResult = await db.query(detailsQuery, [transactionId]);

    const supplierName = detailsResult.rows.length > 0 && detailsResult.rows[0].supplier_name
      ? detailsResult.rows[0].supplier_name
      : 'Unknown Supplier';

    // Parse Delivery Number from remarks (e.g., "Initial Stock. Delivery No: DEL-123")
    let deliveryNumber = 'Unknown';
    if (remarks && remarks.includes('Delivery No:')) {
      deliveryNumber = remarks.split('Delivery No:')[1].trim();
    }

    res.status(200).json({
      supplier: supplierName,
      deliveryReceipt: `${transactionId}-DR.jpg`,
      deliveryNumber: deliveryNumber,
      items: detailsResult.rows
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getItemTransactionHistory = async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT 
        t.transaction_id,
        t.transaction_type,
        TO_CHAR(t.transaction_date, 'MM/DD/YYYY') as date,
        t.ris_no,
        t.delivery_number,
        o.office_name as recipient,
        s.supplier_name,
        td.quantity,
        t.remarks
      FROM Transaction_Details td
      JOIN Transactions t ON td.transaction_id = t.transaction_id
      LEFT JOIN Offices o ON t.office_id = o.office_id
      JOIN Items i ON td.item_id = i.item_id
      LEFT JOIN Suppliers s ON i.supplier_id = s.supplier_id
      WHERE td.item_id = $1
      ORDER BY t.transaction_date DESC, t.transaction_id DESC
    `;
    const result = await db.query(query, [id]);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getItemAllocationPerOffice = async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT 
        COALESCE(o.office_name, 'Unknown Office') as office_name, 
        COALESCE(o.acronym, 'N/A') as acronym,
        SUM(td.quantity) as total_allocated
      FROM Transaction_Details td
      JOIN Transactions t ON td.transaction_id = t.transaction_id
      LEFT JOIN Offices o ON t.office_id = o.office_id
      WHERE td.item_id = $1 AND t.transaction_type = 'OUT'
      GROUP BY o.office_name, o.acronym
      ORDER BY total_allocated DESC
    `;
    const result = await db.query(query, [id]);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.registerUser = async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const checkUser = await db.query('SELECT * FROM Users WHERE username = $1', [username]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO Users (username, password, role) VALUES ($1, $2, $3) RETURNING user_id, username, role',
      [username, hashedPassword, role || 'staff']
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
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      // Fallback for existing plain text passwords if any (optional, but good for transition)
      if (user.password === password) {
        // Auto-update to hashed password
        const newHash = await bcrypt.hash(password, 10);
        await db.query('UPDATE Users SET password = $1 WHERE user_id = $2', [newHash, user.user_id]);
      } else {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    }

    const token = jwt.sign(
      { id: user.user_id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'bsp_inventory_secret_key_2026',
      { expiresIn: '8h' }
    );

    res.status(200).json({ 
      message: 'Login successful', 
      token,
      user: { id: user.user_id, username: user.username, role: user.role } 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};