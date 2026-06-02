const db = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/* =========================================
   SECTION 1: ITEM MANAGEMENT (CRUD)
   ========================================= */

exports.getAllSuppliers = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM Suppliers ORDER BY supplier_name ASC');
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

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
      SELECT 
        i.item_id, i.item_code, i.item_name, i.description, i.brand, i.size, 
        i.unit_of_measure, i.unit_price, i.category_id, i.supplier_id, 
        i.current_stock, i.reorder_level, i.status,
        CASE WHEN i.image_url IS NOT NULL THEN '/api/items/' || i.item_id || '/image' ELSE NULL END AS image_url,
        c.category_name, s.supplier_name 
      FROM Items i
      LEFT JOIN Categories c ON i.category_id = c.category_id
      LEFT JOIN Suppliers s ON i.supplier_id = s.supplier_id
      WHERE i.status = 'ACTIVE'
      ORDER BY i.item_id ASC
    `;
    const result = await db.query(query);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getNextSku = async (req, res) => {
  try {
    // Get the maximum item_id so far and add 1
    const result = await db.query("SELECT COALESCE(MAX(item_id), 0) + 1 AS next_id FROM Items");
    const nextId = result.rows[0].next_id;
    const nextSku = 'ITM-' + String(nextId).padStart(6, '0');
    res.status(200).json({ nextSku });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createItem = async (req, res) => {
  // Handle both single item with image (multipart/form-data) and batch (JSON)
  let itemsToCreate = [];
  let isBatch = false;

  if (req.file || req.body.item_code) {
    // Single item creation (possibly with image)
    const item = req.body;
    if (req.file) {
      const base64Image = req.file.buffer.toString('base64');
      item.image_url = `data:${req.file.mimetype};base64,${base64Image}`;
    }
    itemsToCreate = [item];
    isBatch = false;
  } else if (Array.isArray(req.body)) {
    itemsToCreate = req.body;
    isBatch = true;
  } else {
    return res.status(400).json({ error: "Invalid request format" });
  }

  let client;
  try {
    client = await db.pool.connect();
    await client.query('BEGIN');

    const createdItems = [];

    for (const item of itemsToCreate) {
      const { item_code, item_name, description, brand, size, unit_of_measure, unit_price, category_id, supplier_name, reorder_level, quantity, delivery_number, delivery_receipt, image_url } = item;

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
               brand = COALESCE($3, brand),
               size = COALESCE($4, size),
               unit_of_measure = COALESCE($5, unit_of_measure), 
               unit_price = COALESCE($6, unit_price), 
               category_id = COALESCE($7, category_id), 
               supplier_id = COALESCE($8, supplier_id), 
               reorder_level = COALESCE($9, reorder_level),
               current_stock = current_stock + $10,
               image_url = COALESCE($11, image_url),
               status = 'ACTIVE'
           WHERE item_id = $12 RETURNING *`,
          [
            item_name ? item_name.toUpperCase() : null,
            description ? description.toUpperCase() : null,
            brand ? brand.toUpperCase() : null,
            size ? size.toUpperCase() : null,
            unit_of_measure ? unit_of_measure.toUpperCase() : null,
            unit_price,
            category_id || null,
            final_supplier_id,
            reorder_level || 10,
            quantity || 0,
            image_url || null,
            itemToUpdate.item_id
          ]
        );
        newItem = updateRes.rows[0];
      } else {
        // Insert New Item
        const result = await client.query(
          `INSERT INTO Items (item_code, item_name, description, brand, size, unit_of_measure, unit_price, category_id, supplier_id, reorder_level, current_stock, image_url, status) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'ACTIVE') RETURNING *`,
          [
            null, // Temporarily null, will be updated to system generated SKU
            item_name ? item_name.toUpperCase() : null,
            description ? description.toUpperCase() : null,
            brand ? brand.toUpperCase() : null,
            size ? size.toUpperCase() : null,
            unit_of_measure ? unit_of_measure.toUpperCase() : null,
            unit_price,
            category_id || null,
            final_supplier_id,
            reorder_level || 10,
            quantity || 0,
            image_url || null
          ]
        );
        newItem = result.rows[0];

        // Generate and update SKU for the new item
        const generatedSku = 'ITM-' + String(newItem.item_id).padStart(6, '0');
        await client.query(`UPDATE Items SET item_code = $1 WHERE item_id = $2`, [generatedSku, newItem.item_id]);
        newItem.item_code = generatedSku;
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

      // Log the action (Add or Edit)
      const actionType = itemToUpdate ? 'EDIT' : 'ADD';
      const userId = item.user_id || null;
      const username = item.username || 'SYSTEM';
      await client.query(
        `INSERT INTO Audit_Logs (user_id, username, action, entity, entity_id, details) VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, username, actionType, 'ITEM', newItem.item_id, `${actionType === 'ADD' ? 'Added new item' : 'Updated item via creation batch'}: ${newItem.item_name}`]
      );

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
  const { item_code, item_name, description, brand, size, unit_of_measure, unit_price, category_id, supplier_id, reorder_level } = req.body;
  
  let image_url = req.body.image_url;
  if (req.file) {
    const base64Image = req.file.buffer.toString('base64');
    image_url = `data:${req.file.mimetype};base64,${base64Image}`;
  }

  try {
    const result = await db.query(
      `UPDATE Items 
       SET item_code = $1, item_name = $2, description = $3, brand = $4, size = $5, unit_of_measure = $6, unit_price = $7, category_id = $8, supplier_id = $9, reorder_level = $10, image_url = COALESCE($11, image_url), status = 'ACTIVE'
       WHERE item_id = $12 RETURNING *`,
      [
        item_code ? item_code.toUpperCase() : null,
        item_name ? item_name.toUpperCase() : null,
        description ? description.toUpperCase() : null,
        brand ? brand.toUpperCase() : null,
        size ? size.toUpperCase() : null,
        unit_of_measure ? unit_of_measure.toUpperCase() : null,
        unit_price,
        category_id,
        supplier_id,
        reorder_level,
        image_url || null,
        id
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Item not found' });
    
    // Log the action (Edit)
    const userId = req.body.user_id || null;
    const username = req.body.username || 'SYSTEM';
    await db.query(
      `INSERT INTO Audit_Logs (user_id, username, action, entity, entity_id, details) VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, username, 'EDIT', 'ITEM', id, `Updated item details: ${result.rows[0].item_name}`]
    );

    // Check for low stock after update and notify
    const updatedItem = result.rows[0];
    if (updatedItem.current_stock <= updatedItem.reorder_level) {
      await createNotification(db, {
        target_role: 'SUPPLY_OFFICER',
        message: `Low stock alert: ${updatedItem.item_name} has only ${updatedItem.current_stock} remaining.`,
        type: 'WARNING'
      });
    }

    res.status(200).json(updatedItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteItem = async (req, res) => {
  const { id } = req.params;
  const { user_id, password } = req.body;
  if (!user_id || !password) {
    return res.status(400).json({ error: 'User ID and password are required for deactivation' });
  }

  let client;
  try {
    // Verify user and password
    const userRes = await db.query('SELECT * FROM Users WHERE user_id = $1', [user_id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userRes.rows[0];
    
    // Check role (SUPERADMIN or ADMIN)
    if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN' && user.role !== 'SUPPLY_OFFICER') {
      return res.status(403).json({ error: 'You do not have permission to deactivate items' });
    }
    
    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch && user.password !== password) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    client = await db.pool.connect();
    await client.query('BEGIN');

    // Instead of deleting, we mark as INACTIVE
    const result = await client.query("UPDATE Items SET status = 'INACTIVE' WHERE item_id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Log the deactivation
    const item = result.rows[0];
    await client.query(
      `INSERT INTO Audit_Logs (user_id, username, action, entity, entity_id, details) VALUES ($1, $2, $3, $4, $5, $6)`,
      [user.user_id, user.username, 'DEACTIVATE', 'ITEM', id, `Deactivated item: ${item.item_name} (${item.item_code || 'No SKU'})`]
    );

    await client.query('COMMIT');
    res.status(200).json({ message: 'Item deactivated successfully' });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    if (client) client.release();
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
    
    // We'll search for this month's transactions to find the next number
    const risPrefix = `${acronym}-${YYYY}-${MM}`;

    // 3. Find latest sequence number for this month for THIS specific acronym
    const latestRisRes = await db.query(
      `SELECT ris_no FROM Transactions 
       WHERE ris_no LIKE $1 
       ORDER BY transaction_id DESC LIMIT 1`,
      [`${acronym}-${YYYY}-${MM}-%`]
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

    const nextRis = `${risPrefix}-${String(nextSequence).padStart(4, '0')}`;
    res.status(200).json({ nextRis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createRequest = async (req, res) => {
  console.log('--- CREATE REQUEST START ---');
  console.log('User from token:', req.user);
  let { purpose, priority, justification, items, requested_by } = req.body;
  let office_id = req.body.office_id;
  
  // If user is FOCAL_OFFICER, ALWAYS use their own office_id from token, ignoring any provided ID
  if (req.user && req.user.role === 'FOCAL_OFFICER') {
    office_id = req.user.office_id;
    console.log(`Focal Officer detected. Forcing office_id: ${office_id} for user: ${req.user.username}`);
  }
  
  console.log('Final office_id to be used:', office_id);

  let client;
  try {
    client = await db.pool.connect();
    await client.query('BEGIN');

    // 1. Generate Request Number
    const year = new Date().getFullYear();
    const countRes = await client.query('SELECT request_number FROM Requests WHERE request_number LIKE $1 ORDER BY request_id DESC LIMIT 1', [`REQ-${year}-%`]);
    let nextSeq = 1;
    if (countRes.rows.length > 0) {
      const lastReq = countRes.rows[0].request_number;
      const parts = lastReq.split('-');
      nextSeq = parseInt(parts[2], 10) + 1;
    }
    const request_number = `REQ-${year}-${String(nextSeq).padStart(4, '0')}`;

    // 2. Insert Request Header
    const requestRes = await client.query(
      `INSERT INTO Requests (request_number, office_id, purpose, priority, justification, status, requested_by) 
       VALUES ($1, $2, $3, $4, $5, 'PENDING', $6) RETURNING request_id`,
      [request_number, office_id, purpose, priority || 'NORMAL', justification, requested_by]
    );
    const requestId = requestRes.rows[0].request_id;

    // 3. Insert Request Details
    for (const item of items) {
      await client.query(
        `INSERT INTO Request_Details (request_id, item_id, quantity) VALUES ($1, $2, $3)`,
        [requestId, item.item_id, item.quantity]
      );
    }

    await client.query('COMMIT');

    // 4. Notify Admin (Supply Officer) of the incoming request
    const officeRes = await db.query('SELECT office_name FROM Offices WHERE office_id = $1', [office_id]);
    const officeName = officeRes.rows[0]?.office_name || 'An office';

    await createNotification(db, {
      target_role: 'SUPPLY_OFFICER',
      message: `New supply request ${request_number} submitted from ${officeName}.`,
      type: 'WARNING',
      action_link: '/inventory/outflow',
      action_label: 'Process Request'
    });

    res.status(201).json({ message: 'Request submitted successfully', request_id: requestId, request_number });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    if (client) client.release();
  }
};

exports.updateRequestStatus = async (req, res) => {
  const { id } = req.params;
  const { status, items } = req.body; // items: [{item_id, approved_quantity}]

  let client;
  try {
    client = await db.pool.connect();
    await client.query('BEGIN');

    // 1. Update Request Status
    await client.query(
      'UPDATE Requests SET status = $1 WHERE request_id = $2',
      [status, id]
    );

    // 2. If status is APPROVED or PARTIAL, update approved_quantity in details
    if ((status === 'APPROVED' || status === 'PARTIAL') && items) {
      for (const item of items) {
        await client.query(
          'UPDATE Request_Details SET approved_quantity = $1 WHERE request_id = $2 AND item_id = $3',
          [item.approved_quantity, id, item.item_id]
        );
      }
    }

    await client.query('COMMIT');

    // 3. Notify the requesting office AND the Admin (Receiving)
    const reqInfo = await db.query('SELECT request_number, office_id FROM Requests WHERE request_id = $1', [id]);
    if (reqInfo.rows.length > 0) {
      const { request_number, office_id } = reqInfo.rows[0];
      // Notify Focal (The user whose request was processed)
      await createNotification(db, {
        office_id: office_id,
        target_role: 'FOCAL_OFFICER',
        message: `Your request ${request_number} has been ${status.toLowerCase()}.`,
        type: status === 'REJECTED' ? 'ERROR' : 'SUCCESS',
        action_link: '/focal/status',
        action_label: 'View Status'
      });
      // Notify Admin (Information only)
      await createNotification(db, {
        target_role: 'SUPPLY_OFFICER',
        message: `Request ${request_number} has been ${status.toLowerCase()} by a Focal Officer.`,
        type: 'INFO',
        action_link: '/history',
        action_label: 'View History'
      });
    }

    res.status(200).json({ message: `Request status updated to ${status}` });
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
      const updateRes = await client.query(
        `UPDATE Items SET current_stock = current_stock - $1 WHERE item_id = $2 RETURNING item_code, item_name, current_stock, reorder_level`,
        [item.quantity, item.item_id]
      );
      
      const updatedItem = updateRes.rows[0];
      if (updatedItem && updatedItem.current_stock <= updatedItem.reorder_level) {
        await createNotification(client, {
          target_role: 'SUPPLY_OFFICER',
          message: `Low Stock Alert: ${updatedItem.item_name} has fallen to ${updatedItem.current_stock} units.`,
          type: 'ERROR',
          action_label: 'Replenish',
          action_link: `/inventory/catalog?action=replenish&sku=${updatedItem.item_code}`
        });
      }
    }

    // 3. If it was from a Request, update the request status to RELEASED and notify
    if (request_id) {
      await client.query(
        `UPDATE Requests SET status = 'RELEASED' WHERE request_id = $1`,
        [request_id]
      );

      const reqInfo = await db.query('SELECT request_number, office_id FROM Requests WHERE request_id = $1', [request_id]);
      if (reqInfo.rows.length > 0) {
        const { request_number, office_id } = reqInfo.rows[0];
        await createNotification(db, {
          office_id: office_id,
          target_role: 'FOCAL_OFFICER',
          message: `Supplies for request ${request_number} have been released. RIS: ${ris_no}.`,
          type: 'SUCCESS',
          action_link: '/focal/log',
          action_label: 'View Log'
        });
      }
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
    const query = `
      SELECT 
        item_id, item_code, item_name, description, brand, size, 
        unit_of_measure, unit_price, category_id, supplier_id, 
        current_stock, reorder_level, status,
        CASE WHEN image_url IS NOT NULL THEN '/api/items/' || item_id || '/image' ELSE NULL END AS image_url
      FROM Items 
      WHERE item_code = $1
    `;
    const result = await db.query(query, [code]);
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
        r.priority,
        r.justification,
        r.requested_by,
        r.office_id as department_id,
        o.office_name as "deptName",
        o.office_name,
        o.acronym,
        o.dept_code as "deptCode",
        TO_CHAR(r.request_date AT TIME ZONE 'Asia/Manila', 'FMMonth DD, YYYY') as date,
        TO_CHAR(r.request_date AT TIME ZONE 'Asia/Manila', 'HH:MI AM') as time,
        (SELECT COUNT(*) FROM Request_Details rd WHERE rd.request_id = r.request_id) as "itemsCount"
      FROM Requests r
      JOIN Offices o ON r.office_id = o.office_id
      WHERE r.status = 'PENDING'
      ORDER BY r.request_date DESC, r.request_id DESC
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
        TO_CHAR(t.transaction_date AT TIME ZONE 'Asia/Manila', 'FMMonth DD, YYYY') as date,
        TO_CHAR(t.transaction_date AT TIME ZONE 'Asia/Manila', 'HH:MI AM') as time,
        (SELECT COUNT(*) FROM Transaction_Details td WHERE td.transaction_id = t.transaction_id) as "itemsCount",
        COALESCE(r.purpose, t.remarks) as purpose,
        t.remarks,
        r.requested_by,
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
        COALESCE(rd.approved_quantity, 0) as "issueQty",
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
    console.error('Error in getRequestDetails:', err);
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
  const { office, status } = req.query;
  const user = req.user;

  try {
    let query = `
      SELECT * FROM (
        SELECT 
          t.ris_no as "risNo",
          COALESCE(o.office_name, 'UNKNOWN OFFICE') as "requestingOffice",
          o.office_id,
          TO_CHAR(t.transaction_date AT TIME ZONE 'Asia/Manila', 'MM/DD/YYYY') as "dateRequested",
          TO_CHAR(t.transaction_date AT TIME ZONE 'Asia/Manila', 'MM/DD/YYYY') as "dateReleased",
          (SELECT COALESCE(SUM(quantity), 0) FROM Transaction_Details td WHERE td.transaction_id = t.transaction_id) as "noOfItems",
          'RELEASED' as status,
          t.transaction_date as "sortDate",
          t.transaction_id as "sortId"
        FROM Transactions t
        LEFT JOIN Offices o ON t.office_id = o.office_id
        WHERE t.transaction_type = 'OUT'
        UNION ALL
        SELECT 
          r.request_number as "risNo",
          COALESCE(o.office_name, 'UNKNOWN OFFICE') as "requestingOffice",
          o.office_id,
          TO_CHAR(r.request_date AT TIME ZONE 'Asia/Manila', 'MM/DD/YYYY') as "dateRequested",
          '-' as "dateReleased",
          (SELECT COALESCE(SUM(quantity), 0) FROM Request_Details rd WHERE rd.request_id = r.request_id) as "noOfItems",
          r.status as status,
          r.request_date as "sortDate",
          r.request_id as "sortId"
        FROM Requests r
        LEFT JOIN Offices o ON r.office_id = o.office_id
        WHERE r.status IN ('REJECTED', 'CANCELLED', 'PENDING', 'APPROVED', 'PARTIAL')
      ) AS history_data
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    // SECURITY: If user is FOCAL_OFFICER, strictly limit to their office_id
    if (user.role === 'FOCAL_OFFICER') {
      query += ` AND office_id = $${paramIndex++}`;
      params.push(user.office_id);
    } else if (office && office !== 'N/A' && office !== '') {
      // Admins can filter by office name
      query += ` AND "requestingOffice" = $${paramIndex++}`;
      params.push(office);
    }

    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    query += ` ORDER BY "sortDate" DESC, "sortId" DESC`;
    
    const result = await db.query(query, params);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error in getRequestsHistory:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getActivityLog = async (req, res) => {
  try {
    const query = `
      SELECT 
        'ALOG-' || TO_CHAR(t.transaction_date AT TIME ZONE 'Asia/Manila', 'YYYY') || '-' || LPAD(t.transaction_id::text, 3, '0') as "activityLogId",
        TO_CHAR(t.transaction_date AT TIME ZONE 'Asia/Manila', 'MM/DD/YYYY HH:MI AM') as timestamp,
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

exports.getMyRequests = async (req, res) => {
  const { type } = req.query; // type: 'active' or 'log'
  const office_id = req.user.office_id; // Get from token

  if (!office_id) {
    return res.status(400).json({ error: 'User office ID not found in token' });
  }

  try {
    let query = `
      SELECT 
        r.request_id as id,
        r.request_number as "reqNumber",
        (SELECT ris_no FROM Transactions t WHERE t.request_id = r.request_id AND t.transaction_type = 'OUT' LIMIT 1) as "risNumber",
        r.purpose,
        r.status,
        r.priority,
        TO_CHAR(r.request_date AT TIME ZONE 'Asia/Manila', 'MM/DD/YYYY') as date,
        TO_CHAR(r.request_date AT TIME ZONE 'Asia/Manila', 'HH:MI AM') as time,
        (SELECT COUNT(*) FROM Request_Details rd WHERE rd.request_id = r.request_id) as "itemsCount"
      FROM Requests r
      WHERE r.office_id = $1
    `;

    if (type === 'active') {
      query += " AND r.status IN ('PENDING', 'APPROVED', 'PARTIAL')";
    } else if (type === 'log') {
      query += " AND r.status IN ('RELEASED', 'REJECTED', 'CANCELLED')";
    }

    query += " ORDER BY r.request_date DESC, r.request_id DESC";
    const result = await db.query(query, [office_id]);
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
        TO_CHAR(t.transaction_date AT TIME ZONE 'Asia/Manila', 'MM/DD/YYYY') as date,
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


/* =========================================
   SECTION 9: NOTIFICATIONS
   ========================================= */

const createNotification = async (client, data) => {
  const { user_id, office_id, target_role, message, type, action_link, action_label } = data;
  try {
    await client.query(
      'INSERT INTO Notifications (user_id, office_id, target_role, message, type, action_link, action_label) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [user_id || null, office_id || null, target_role || null, message, type || 'INFO', action_link || null, action_label || null]
    );
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
};

exports.getNotifications = async (req, res) => {
  const user = req.user;
  try {
    let query = `
      SELECT notification_id as id, message, type, is_read, action_link, action_label,
             TO_CHAR(created_at, 'MM/DD/YYYY HH:MI AM') as time
      FROM Notifications
      WHERE ($3 = 'SUPERADMIN' 
         OR user_id = $1 
         OR (office_id = $2 AND (target_role IS NULL OR target_role = $3))
         OR (office_id IS NULL AND target_role = $3))
      ORDER BY created_at DESC
      LIMIT 50
    `;
    const result = await db.query(query, [user.id, user.office_id, user.role]);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.markNotificationRead = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('UPDATE Notifications SET is_read = TRUE WHERE notification_id = $1', [id]);
    res.status(200).json({ message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getNotificationHistory = async (req, res) => {
  const user = req.user;
  try {
    let query = `
      SELECT notification_id as id, message, type, is_read, action_link, action_label,
             TO_CHAR(created_at, 'MM/DD/YYYY HH:MI AM') as time
      FROM Notifications
      WHERE ($3 = 'SUPERADMIN' 
         OR user_id = $1 
         OR (office_id = $2 AND (target_role IS NULL OR target_role = $3))
         OR (office_id IS NULL AND target_role = $3))
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [user.id, user.office_id, user.role]);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.markAllRead = async (req, res) => {
  const user = req.user;
  try {
    if (user.role === 'SUPERADMIN') {
      await db.query('UPDATE Notifications SET is_read = TRUE');
    } else {
      await db.query(
        'UPDATE Notifications SET is_read = TRUE WHERE (user_id = $1 OR office_id = $2 OR target_role = $3)',
        [user.id, user.office_id, user.role]
      );
    }
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* =========================================
   SECTION 7: AUDIT LOGS (Superadmin)
   ========================================= */

exports.getAuditLogs = async (req, res) => {
  try {
    const query = `
      SELECT 
        log_id,
        user_id,
        username,
        action,
        entity,
        entity_id,
        details,
        TO_CHAR(timestamp, 'MM/DD/YYYY HH:MI AM') as timestamp
      FROM Audit_Logs
      ORDER BY log_id DESC
    `;
    const result = await db.query(query);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* =========================================
   SECTION 8: REPORTS & ANALYSIS
   ========================================= */

exports.getLowStockItems = async (req, res) => {
  try {
    const query = `
      SELECT 
        i.item_code as sku,
        i.item_name,
        i.current_stock,
        i.reorder_level,
        c.category_name
      FROM Items i
      LEFT JOIN Categories c ON i.category_id = c.category_id
      WHERE i.current_stock <= i.reorder_level AND i.status = 'ACTIVE'
      ORDER BY i.current_stock ASC
    `;
    const result = await db.query(query);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getIssuanceSummary = async (req, res) => {
  const { month, year } = req.query;
  try {
    let query = `
      SELECT 
        o.office_name as office,
        o.acronym,
        COUNT(DISTINCT r.request_id) as total_requests,
        SUM(td.quantity) as total_issued
      FROM Transactions t
      JOIN Transaction_Details td ON t.transaction_id = td.transaction_id
      LEFT JOIN Offices o ON t.office_id = o.office_id
      LEFT JOIN Requests r ON t.request_id = r.request_id
      WHERE t.transaction_type = 'OUT'
    `;
    const params = [];
    let paramIdx = 1;
    if (month && year) {
      query += ` AND EXTRACT(MONTH FROM t.transaction_date) = $${paramIdx++} AND EXTRACT(YEAR FROM t.transaction_date) = $${paramIdx++}`;
      params.push(parseInt(month), parseInt(year));
    } else if (year) {
      query += ` AND EXTRACT(YEAR FROM t.transaction_date) = $${paramIdx++}`;
      params.push(parseInt(year));
    }

    query += `
      GROUP BY o.office_name, o.acronym
      ORDER BY total_issued DESC NULLS LAST
    `;
    const result = await db.query(query, params);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getStockDistribution = async (req, res) => {
  try {
    const query = `
      SELECT 
        c.category_name as category,
        SUM(i.current_stock) as total_stock,
        COUNT(i.item_id) as total_items
      FROM Items i
      LEFT JOIN Categories c ON i.category_id = c.category_id
      WHERE i.status = 'ACTIVE'
      GROUP BY c.category_name
      ORDER BY total_stock DESC
    `;
    const result = await db.query(query);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUsageTrend = async (req, res) => {
  try {
    const topMostQuery = `
      SELECT i.item_name as name, SUM(td.quantity) as total_issued
      FROM Transaction_Details td
      JOIN Transactions t ON td.transaction_id = t.transaction_id
      JOIN Items i ON td.item_id = i.item_id
      WHERE t.transaction_type = 'OUT' AND EXTRACT(YEAR FROM t.transaction_date) = EXTRACT(YEAR FROM CURRENT_DATE)
      GROUP BY i.item_name
      ORDER BY total_issued DESC
      LIMIT 5
    `;
    const topMostRes = await db.query(topMostQuery);

    const topLeastQuery = `
      SELECT i.item_name as name, SUM(td.quantity) as total_issued
      FROM Transaction_Details td
      JOIN Transactions t ON td.transaction_id = t.transaction_id
      JOIN Items i ON td.item_id = i.item_id
      WHERE t.transaction_type = 'OUT' AND EXTRACT(YEAR FROM t.transaction_date) = EXTRACT(YEAR FROM CURRENT_DATE)
      GROUP BY i.item_name
      ORDER BY total_issued ASC
      LIMIT 5
    `;
    const topLeastRes = await db.query(topLeastQuery);

    const chartQuery = `
      SELECT 
        COALESCE(c.category_name, 'Uncategorized') as category_name,
        EXTRACT(QUARTER FROM t.transaction_date) as quarter,
        SUM(td.quantity) as total_issued
      FROM Transaction_Details td
      JOIN Transactions t ON td.transaction_id = t.transaction_id
      JOIN Items i ON td.item_id = i.item_id
      LEFT JOIN Categories c ON i.category_id = c.category_id
      WHERE t.transaction_type = 'OUT' AND EXTRACT(YEAR FROM t.transaction_date) = EXTRACT(YEAR FROM CURRENT_DATE)
      GROUP BY c.category_name, quarter
      ORDER BY c.category_name, quarter
    `;
    const chartRes = await db.query(chartQuery);

    res.status(200).json({
      top5Most: topMostRes.rows,
      top5Least: topLeastRes.rows,
      chartData: chartRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCategoryBreakdown = async (req, res) => {
  const { month, year } = req.query;
  try {
    let usageQuery = `
      SELECT 
        COALESCE(c.category_name, 'Uncategorized') as name,
        SUM(td.quantity) as total_issued
      FROM Transaction_Details td
      JOIN Transactions t ON td.transaction_id = t.transaction_id
      JOIN Items i ON td.item_id = i.item_id
      LEFT JOIN Categories c ON i.category_id = c.category_id
      WHERE t.transaction_type = 'OUT'
    `;
    const params = [];
    let paramIdx = 1;
    if (month && year) {
      usageQuery += ` AND EXTRACT(MONTH FROM t.transaction_date) = $${paramIdx++} AND EXTRACT(YEAR FROM t.transaction_date) = $${paramIdx++}`;
      params.push(parseInt(month), parseInt(year));
    } else if (year) {
      usageQuery += ` AND EXTRACT(YEAR FROM t.transaction_date) = $${paramIdx++}`;
      params.push(parseInt(year));
    }

    usageQuery += `
      GROUP BY c.category_name
      ORDER BY total_issued DESC
    `;
    const usageRes = await db.query(usageQuery, params);

    const valueQuery = `
      SELECT 
        COALESCE(c.category_name, 'Uncategorized') as name,
        SUM(i.current_stock * i.unit_price) as total_value
      FROM Items i
      LEFT JOIN Categories c ON i.category_id = c.category_id
      GROUP BY c.category_name
      ORDER BY total_value DESC
    `;
    const valueRes = await db.query(valueQuery);

    res.status(200).json({
      topUsage: usageRes.rows,
      topValue: valueRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllocationEfficiency = async (req, res) => {
  try {
    const overallQuery = `
      SELECT 
        AVG(EXTRACT(EPOCH FROM (t.transaction_date - r.request_date)) / 86400) as avg_processing_days,
        (SELECT AVG(total_qty) FROM (SELECT SUM(quantity) as total_qty FROM Request_Details GROUP BY request_id) as sq) as avg_items_per_request,
        ((COUNT(CASE WHEN r.status IN ('APPROVED', 'RELEASED') THEN 1 END)::float / NULLIF(COUNT(*), 0)) * 100) as approval_rate
      FROM Requests r
      LEFT JOIN Transactions t ON r.request_id = t.request_id AND t.transaction_type = 'OUT'
    `;
    const overallRes = await db.query(overallQuery);

    const chartQuery = `
      SELECT 
        m.month_name as timeline,
        COALESCE(AVG(EXTRACT(EPOCH FROM (t.transaction_date - r.request_date)) / 86400), 0) as allocation_time_days,
        COALESCE(((COUNT(CASE WHEN r.status IN ('APPROVED', 'RELEASED') THEN 1 END)::float / NULLIF(COUNT(r.request_id), 0)) * 100), 0) as approval_rate
      FROM (
        SELECT to_char(to_date(m::text, 'MM'), 'Mon') AS month_name, m as month_num
        FROM generate_series(1, 12) m
      ) m
      LEFT JOIN Requests r ON EXTRACT(MONTH FROM r.request_date) = m.month_num AND EXTRACT(YEAR FROM r.request_date) = EXTRACT(YEAR FROM CURRENT_DATE)
      LEFT JOIN Transactions t ON r.request_id = t.request_id AND t.transaction_type = 'OUT'
      GROUP BY m.month_name, m.month_num
      ORDER BY m.month_num
    `;
    const chartRes = await db.query(chartQuery);

    res.status(200).json({
      overall: overallRes.rows[0],
      chartData: chartRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMonthlyInventoryReport = async (req, res) => {
  const { month, year } = req.query;
  if (!month || !year) return res.status(400).json({ error: "Month and Year are required" });

  try {
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const query = `
      WITH BeginningInventory AS (
          SELECT 
              i.item_id,
              COALESCE(SUM(CASE WHEN t.transaction_type = 'IN' THEN td.quantity ELSE -td.quantity END), 0) as beginning_qty
          FROM Items i
          LEFT JOIN Transaction_Details td ON i.item_id = td.item_id
          LEFT JOIN Transactions t ON td.transaction_id = t.transaction_id AND t.transaction_date < $1
          GROUP BY i.item_id
      ),
      MonthlyTransactions AS (
          SELECT 
              td.item_id,
              SUM(CASE WHEN t.transaction_type = 'IN' THEN td.quantity ELSE 0 END) as total_in,
              SUM(CASE WHEN t.transaction_type = 'OUT' THEN td.quantity ELSE 0 END) as total_out
          FROM Transaction_Details td
          JOIN Transactions t ON td.transaction_id = t.transaction_id
          WHERE t.transaction_date >= $1 AND t.transaction_date <= $2
          GROUP BY td.item_id
      )
      SELECT
          i.item_id,
          i.item_code,
          i.item_name,
          i.unit_of_measure,
          i.unit_price,
          c.category_name,
          s.supplier_name,
          COALESCE(bi.beginning_qty, 0) as beginning_qty,
          COALESCE(mt.total_in, 0) as total_in,
          COALESCE(mt.total_out, 0) as total_out,
          (COALESCE(bi.beginning_qty, 0) + COALESCE(mt.total_in, 0) - COALESCE(mt.total_out, 0)) as ending_qty
      FROM Items i
      LEFT JOIN Categories c ON i.category_id = c.category_id
      LEFT JOIN Suppliers s ON i.supplier_id = s.supplier_id
      LEFT JOIN BeginningInventory bi ON i.item_id = bi.item_id
      LEFT JOIN MonthlyTransactions mt ON i.item_id = mt.item_id
      ORDER BY c.category_name, i.item_name    `;

    const result = await db.query(query, [startDate, endDate]);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMonthlyRSMIReport = async (req, res) => {
  const { month, year } = req.query;
  if (!month || !year) return res.status(400).json({ error: "Month and Year are required" });

  try {
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const query = `
      SELECT 
          t.ris_no,
          t.transaction_date as date,
          o.office_name,
          i.item_code,
          i.item_name,
          i.unit_of_measure,
          td.quantity,
          td.unit_cost,
          (td.quantity * td.unit_cost) as total_cost
      FROM Transactions t
      JOIN Transaction_Details td ON t.transaction_id = td.transaction_id
      JOIN Items i ON td.item_id = i.item_id
      LEFT JOIN Offices o ON t.office_id = o.office_id
      WHERE t.transaction_type = 'OUT' 
      AND t.transaction_date >= $1 
      AND t.transaction_date <= $2
      ORDER BY t.transaction_date ASC, t.ris_no ASC
    `;

    const result = await db.query(query, [startDate, endDate]);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.saveGeneratedReport = async (req, res) => {
  const { title, report_number, category, type, office, file_data } = req.body;
  const userId = req.user.id;

  try {
    const query = `
      INSERT INTO Generated_Reports (title, report_number, category, type, office, file_data, generated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING report_id as id
    `;
    const result = await db.query(query, [title, report_number, category, type, office, file_data, userId]);
    res.status(201).json({ message: 'Report saved successfully', id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getGeneratedReports = async (req, res) => {
  try {
    const query = `
      SELECT 
        report_id as id, title, report_number as "reportNumber", category, type, office, status,
        TO_CHAR(created_at, 'Mon DD, YYYY') as "dateGenerated"
      FROM Generated_Reports
      ORDER BY created_at DESC
    `;
    const result = await db.query(query);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteGeneratedReport = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("UPDATE Generated_Reports SET status = 'ARCHIVED' WHERE report_id = $1", [id]);
    res.status(200).json({ message: 'Report archived' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.restoreGeneratedReport = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("UPDATE Generated_Reports SET status = 'ACTIVE' WHERE report_id = $1", [id]);
    res.status(200).json({ message: 'Report restored' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSingleGeneratedReport = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'SELECT file_data as "fileData" FROM Generated_Reports WHERE report_id = $1',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Report not found' });
    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getItemImage = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT image_url FROM Items WHERE item_id = $1', [id]);
    if (result.rows.length === 0 || !result.rows[0].image_url) {
      return res.status(404).json({ message: 'Image not found' });
    }

    const imageUrl = result.rows[0].image_url;

    // Check if it is a Data URI (base64)
    if (imageUrl.startsWith('data:')) {
      const matches = imageUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-+.]+);base64,(.*)$/);
      if (matches && matches.length === 3) {
        const contentType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        
        res.writeHead(200, {
          'Content-Type': contentType,
          'Content-Length': buffer.length,
          'Cache-Control': 'public, max-age=86400' // Cache image for 1 day
        });
        return res.end(buffer);
      }
    }

    // If it is stored as a direct relative path (legacy/fallback)
    return res.redirect(imageUrl);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};