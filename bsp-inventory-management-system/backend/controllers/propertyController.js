const db = require('../db');

const createIar = async (req, res) => {
  const { fundCluster, supplierName, poPrNo, poPrDate, requisitioningOffice, responsibilityCenterCode, iarDate, invoiceDrNo, invoiceDate, inspectionDate, inspectedBy, inspectedByDesignation, inspectionStatus, receivedDate, acceptedBy, acceptedByDesignation, acceptanceStatus, items } = req.body;
  if (!supplierName || !items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Supplier name and at least one item are required.' });
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN'); await client.query('LOCK TABLE IAR_Records IN SHARE ROW EXCLUSIVE MODE');
    const now = new Date(); const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const iarNoRes = await client.query(`SELECT iar_no FROM IAR_Records WHERE iar_no LIKE $1 ORDER BY iar_id DESC LIMIT 1`, [`${prefix}-%`]);
    let n = 1; if (iarNoRes.rows.length > 0) { const last = iarNoRes.rows[0].iar_no; n = parseInt(last.split('-')[last.split('-').length - 1], 10) + 1; }
    const finalIarNo = `${prefix}-${String(n).padStart(3, '0')}`;
    const iarResult = await client.query(`INSERT INTO IAR_Records (iar_no, entity_name, fund_cluster, supplier_name, po_pr_no, po_pr_date, requisitioning_office, responsibility_center_code, iar_date, invoice_dr_no, invoice_date, inspection_date, inspected_by, inspected_by_designation, inspection_status, received_date, accepted_by, accepted_by_designation, acceptance_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) RETURNING iar_id`, [finalIarNo, 'Boy Scouts of the Philippines', fundCluster || null, supplierName, poPrNo || null, poPrDate || null, requisitioningOffice || null, responsibilityCenterCode || null, iarDate || null, invoiceDrNo || null, invoiceDate || null, inspectionDate || null, inspectedBy || null, inspectedByDesignation || null, inspectionStatus || 'Found in order as to quantity and specifications', receivedDate || null, acceptedBy || null, acceptedByDesignation || null, acceptanceStatus || 'Complete']);
    const iarId = iarResult.rows[0].iar_id;
    let officeId = null; if (requisitioningOffice) { const offRes = await client.query("SELECT office_id FROM Offices WHERE acronym = $1 LIMIT 1", [requisitioningOffice.toUpperCase()]); if (offRes.rows.length > 0) officeId = offRes.rows[0].office_id; }
    if (!officeId) { const offRes = await client.query("SELECT office_id FROM Offices WHERE acronym = 'PMDD' LIMIT 1"); officeId = offRes.rows.length > 0 ? offRes.rows[0].office_id : null; }
    const cRes = await client.query('SELECT property_id FROM Property_Items ORDER BY property_id DESC LIMIT 1');
    let runId = cRes.rows.length > 0 ? cRes.rows[0].property_id : 0;
    for (const item of items) {
      const quantity = parseInt(item.quantity, 10) || 1; const unitCost = parseFloat(item.unit_cost) || 0;
      const lResult = await client.query(`INSERT INTO IAR_Line_Items (iar_id, item_description, unit, quantity, unit_cost, total_amount, rco, accountable_officer, delivery_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING iar_line_id`, [iarId, item.name, item.unit || 'Unit', quantity, unitCost, quantity * unitCost, item.rco || 'National Office', item.accountable_officer || acceptedBy || 'Sir Jerry', item.delivery_date || receivedDate || new Date().toISOString().split('T')[0]]);
      const iarLineId = lResult.rows[0].iar_line_id; const type = unitCost >= 50000.00 ? 'PAR' : 'ICS';
      for (let q = 0; q < quantity; q++) { runId += 1; const pNo = `BSP-PROP-${String(runId).padStart(4, '0')}`; const sNo = quantity > 1 ? `${item.serial_no || 'SN'}-${q + 1}` : (item.serial_no || null); await client.query(`INSERT INTO Property_Items (property_no, iar_id, iar_line_id, item_name, description, serial_no, unit_cost, or_no, type, accountable_officer, rco, office_id, status, condition, delivery_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`, [pNo, iarId, iarLineId, item.name, item.description || null, sNo, unitCost, type === 'PAR' ? (item.or_number || null) : null, type, item.accountable_officer || acceptedBy || 'Sir Jerry', item.rco || 'National Office', officeId, 'ACTIVE', 'GOOD', item.delivery_date || receivedDate || new Date().toISOString().split('T')[0]]); }
    }
    await client.query('COMMIT'); res.status(201).json({ message: 'IAR encoded successfully.', iarId });
  } catch (error) { await client.query('ROLLBACK'); res.status(500).json({ error: 'Failed to encode IAR.' }); } finally { client.release(); }
};

const getAllProperties = async (req, res) => {
  const { type, office, searchQuery } = req.query;
  let q = `SELECT p.*, o.office_name, o.acronym as office_acronym, i.iar_no, i.supplier_name, i.entity_name, i.fund_cluster, i.po_pr_no, i.po_pr_date FROM Property_Items p LEFT JOIN Offices o ON p.office_id = o.office_id LEFT JOIN IAR_Records i ON p.iar_id = i.iar_id WHERE 1=1`;
  const params = [];
  if (type && type !== 'all') { params.push(type.toUpperCase()); q += ` AND p.type = $${params.length}`; }
  if (office && office !== 'ALL') { params.push(office); q += ` AND (o.acronym = $${params.length} OR p.rco ILIKE $${params.length})`; }
  if (searchQuery) { params.push(`%${searchQuery}%`); q += ` AND (p.item_name ILIKE $${params.length} OR p.property_no ILIKE $${params.length} OR p.serial_no ILIKE $${params.length} OR p.accountable_officer ILIKE $${params.length})`; }
  q += ' ORDER BY p.property_id DESC';
  try { const result = await db.query(q, params); res.json(result.rows); } catch (error) { res.status(500).json({ error: 'Failed.' }); }
};

const getPropertyDetails = async (req, res) => {
  const { id } = req.params;
  try {
    const pRes = await db.query(`SELECT p.*, o.office_name, o.acronym as office_acronym, i.iar_no, i.supplier_name, i.entity_name, i.fund_cluster, i.po_pr_no, i.po_pr_date FROM Property_Items p LEFT JOIN Offices o ON p.office_id = o.office_id LEFT JOIN IAR_Records i ON p.iar_id = i.iar_id WHERE p.property_id = $1`, [id]);
    if (pRes.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    const tRes = await db.query(`SELECT t.*, o.acronym as to_office_acronym FROM Property_Transfers t LEFT JOIN Offices o ON t.to_office_id = o.office_id WHERE t.property_id = $1 ORDER BY t.transfer_date DESC`, [id]);
    const rRes = await db.query(`SELECT * FROM Property_Returns WHERE property_id = $1 ORDER BY return_date DESC`, [id]);
    res.json({ property: pRes.rows[0], transfers: tRes.rows, returns: rRes.rows });
  } catch (error) { res.status(500).json({ error: 'Failed.' }); }
};

const createPropertyTransfer = async (req, res) => {
  const { propertyId, ptrNo, transferDate, transferType, fromOfficer, toOfficer, toOfficeId, reason, receivedBy, approvedBy } = req.body;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`INSERT INTO Property_Transfers (ptr_no, property_id, transfer_date, transfer_type, from_officer, to_officer, to_office_id, reason, received_by, approved_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [ptrNo, propertyId, transferDate, transferType || 'TRANSFER', fromOfficer, toOfficer, toOfficeId, reason || null, receivedBy || null, approvedBy || null]);
    await client.query(`UPDATE Property_Items SET accountable_officer = $1, office_id = $2, status = 'TRANSFERRED' WHERE property_id = $3`, [toOfficer, toOfficeId, propertyId]);
    await client.query('COMMIT'); res.json({ message: 'Recorded.' });
  } catch (error) { await client.query('ROLLBACK'); res.status(500).json({ error: 'Failed.' }); } finally { client.release(); }
};

const createPropertyReturn = async (req, res) => {
  const { propertyId, prsNo, returnDate, returnedBy, receivedBy, reason, conditionOnReturn } = req.body;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`INSERT INTO Property_Returns (prs_no, property_id, return_date, returned_by, received_by, reason, condition_on_return) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [prsNo, propertyId, returnDate, returnedBy, receivedBy, reason || null, conditionOnReturn || 'GOOD']);
    await client.query(`UPDATE Property_Items SET status = 'RETURNED', condition = $1 WHERE property_id = $2`, [conditionOnReturn || 'GOOD', propertyId]);
    await client.query('COMMIT'); res.json({ message: 'Recorded.' });
  } catch (error) { await client.query('ROLLBACK'); res.status(500).json({ error: 'Failed.' }); } finally { client.release(); }
};

const getPropertyReportsCount = async (req, res) => {
  const { type, rco } = req.query;
  let q = `SELECT p.property_no, p.item_name, p.description, p.serial_no, p.unit_cost, p.type, p.accountable_officer, p.rco, p.delivery_date, p.status, p.condition, o.acronym as office_acronym FROM Property_Items p LEFT JOIN Offices o ON p.office_id = o.office_id WHERE 1=1`;
  const params = []; if (type) { params.push(type.toUpperCase()); q += ` AND p.type = $${params.length}`; }
  if (rco && rco !== 'ALL') { params.push(rco); q += ` AND p.rco = $${params.length}`; }
  q += ' ORDER BY p.property_no ASC';
  try { const result = await db.query(q, params); res.json(result.rows); } catch (error) { res.status(500).json({ error: 'Failed.' }); }
};

const getPropertyAnalytics = async (req, res) => {
  try { const kpiRes = await db.query(`SELECT COALESCE(SUM(unit_cost), 0) as total_valuation, COUNT(property_id) as total_units, COUNT(CASE WHEN type = 'PAR' THEN 1 END) as par_count, COALESCE(SUM(CASE WHEN type = 'PAR' THEN unit_cost END), 0) as par_valuation, COUNT(CASE WHEN type = 'ICS' THEN 1 END) as ics_count, COALESCE(SUM(CASE WHEN type = 'ICS' THEN unit_cost END), 0) as ics_valuation FROM Property_Items WHERE status != 'RETURNED'`); res.json({ kpis: kpiRes.rows[0] }); } catch (error) { res.status(500).json({ error: 'Failed.' }); }
};

const getAllIars = async (req, res) => { try { const result = await db.query('SELECT * FROM IAR_Records ORDER BY iar_id DESC'); res.json(result.rows); } catch (error) { res.status(500).json({ error: 'Failed.' }); } };

const getIarDetails = async (req, res) => {
  const { id } = req.params;
  try {
    const iarRes = await db.query('SELECT * FROM IAR_Records WHERE iar_id = $1', [id]);
    if (iarRes.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    const linesRes = await db.query('SELECT * FROM IAR_Line_Items WHERE iar_id = $1', [id]);
    const propsRes = await db.query('SELECT * FROM Property_Items WHERE iar_id = $1', [id]);
    const propMap = {}; propsRes.rows.forEach(p => { if (p.iar_line_id) { if (!propMap[p.iar_line_id]) propMap[p.iar_line_id] = { p: [], s: [] }; if (p.property_no) propMap[p.iar_line_id].p.push(p.property_no); if (p.serial_no) propMap[p.iar_line_id].s.push(p.serial_no); } });
    res.json({ ...iarRes.rows[0], items: linesRes.rows.map(line => { const m = propMap[line.iar_line_id] || { p: [], s: [] }; return { item_name: line.item_description, property_no: m.p.join(', '), serial_no: m.s.join(', '), unit: line.unit, quantity: line.quantity, unit_cost: parseFloat(line.unit_cost), total_amount: parseFloat(line.total_amount), rco: line.rco, accountable_officer: line.accountable_officer, delivery_date: line.delivery_date }; }) });
  } catch (error) { res.status(500).json({ error: 'Failed.' }); }
};

const buildExcelReport = async (iarData, res) => {
  try {
    const ExcelJS = require("exceljs"); const path = require("path"); const workbook = new ExcelJS.Workbook();
    const templatePath = path.join(__dirname, "../iar_template.xlsx"); await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.worksheets[0];
    const formatDate = (dateStr) => { if (!dateStr) return ""; const d = new Date(dateStr); if (isNaN(d.getTime())) return ""; return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }); };

    worksheet.getCell("C10").value = iarData.entityName || iarData.entity_name || "Boy Scouts of the Philippines";
    worksheet.getCell("G10").value = "Fund Cluster : " + (iarData.fundCluster || iarData.fund_cluster || "");
    worksheet.getCell("B12").value = "Supplier : " + (iarData.supplierName || iarData.supplier_name || "");
    worksheet.getCell("I12").value = iarData.iarNo || iarData.iar_no || "";
    worksheet.getCell("B13").value = "Purchase Order/P.R. No. : " + (iarData.poPrNo || iarData.po_no || "") + "       Date: " + formatDate(iarData.poPrDate || iarData.po_date);
    worksheet.getCell("I13").value = formatDate(iarData.iarDate || iarData.iar_date || iarData.created_at);
    worksheet.getCell("B14").value = "Requisitioning Office/Dept. : " + (iarData.requisitioningOffice || iarData.requisitioning_office || "");
    worksheet.getCell("I14").value = iarData.invoiceDrNo || iarData.invoice_no || "";
    worksheet.getCell("B15").value = "Responsibility Center Code : " + (iarData.responsibilityCenterCode || iarData.responsibility_center_code || "");
    worksheet.getCell("I15").value = formatDate(iarData.invoiceDate || iarData.invoice_date);

    const expandedItems = [];
    (iarData.items || []).forEach((item) => {
      const q = parseInt(item.quantity, 10) || 1;
      const pArr = (item.property_no || "").split(",").map(x => x.trim());
      const sArr = (item.serial_no || "").split(",").map(x => x.trim());
      for (let i = 0; i < q; i++) { expandedItems.push({ p: pArr[i] || pArr[0] || "Pending", n: item.name || item.item_name || "", d: item.description || "", s: sArr[i] || (q > 1 ? item.serial_no + "-" + (i+1) : item.serial_no), u: item.unit || "Unit" }); }
    });

    const templateRowsCount = 9; const requiredRowsCount = expandedItems.length;
    const templateRow = worksheet.getRow(18); const styles = [];
    for (let c = 2; c <= 10; c++) { const cell = templateRow.getCell(c); styles[c] = { font: cell.font, fill: cell.fill, border: cell.border, alignment: cell.alignment, numFmt: cell.numFmt }; }

    let shift = 0;
    if (requiredRowsCount > templateRowsCount) {
      shift = requiredRowsCount - templateRowsCount;
      worksheet.insertRows(27, new Array(shift).fill([]), "o");
      for (let r = 27; r < 27 + shift; r++) { const row = worksheet.getRow(r); row.height = templateRow.height; for (let c = 2; c <= 10; c++) { const cell = row.getCell(c); const s = styles[c]; if (s.font) cell.font = s.font; if (s.fill) cell.fill = s.fill; if (s.border) cell.border = s.border; if (s.alignment) cell.alignment = s.alignment; if (s.numFmt) cell.numFmt = s.numFmt; } }
    }

    // MASSIVE CLEARANCE OF SCRATCH DATA BEYOND COLUMN J (11 to 100)
    // We completely delete the columns to remove all phantom data, borders, and formulas.
    worksheet.spliceColumns(11, 50);

    // Also clear the actual item row area values for A-J (except row base formatting)
    for (let r = 18; r <= 27 + shift; r++) {
      const row = worksheet.getRow(r);
      if(row) { for (let c = 2; c <= 10; c++) row.getCell(c).value = null; }
    }

    expandedItems.forEach((u, idx) => {
      const rNum = 18 + idx; const row = worksheet.getRow(rNum);
      row.getCell("B").value = u.p;
      let desc = u.n; if (u.d) desc += " (" + u.d + ")"; if (u.s && u.s !== "N/A") desc += " SN: " + u.s;
      row.getCell("C").value = desc; row.getCell("G").value = u.u; row.getCell("J").value = 1;
      try { worksheet.unmergeCells(`C${rNum}:F${rNum}`); } catch(e) {} try { worksheet.mergeCells(`C${rNum}:F${rNum}`); } catch(e) {}
      try { worksheet.unmergeCells(`G${rNum}:I${rNum}`); } catch(e) {} try { worksheet.mergeCells(`G${rNum}:I${rNum}`); } catch(e) {}
    });

    const base = 18 + requiredRowsCount;
    worksheet.getCell("C" + base).value = "x   x   x   x   x   x   x   x   x   x   x   x   x   x   x   x   x   x   x   x   x   x";  
    try { worksheet.unmergeCells(`C${base}:F${base}`); } catch(e) {} try { worksheet.mergeCells(`C${base}:F${base}`); } catch(e) {} 

    worksheet.getCell("B" + (29 + shift)).value = "Date Inspected : " + (formatDate(iarData.inspectionDate || iarData.inspection_date) || "________________________");
    worksheet.getCell("F" + (29 + shift)).value = "Date Received : " + (formatDate(iarData.receivedDate || iarData.received_date) || "_____________________");

    const setInlineCheck = (addr, isChecked, originalText) => {
       const c = worksheet.getCell(addr);
       // Replace the first 2 characters of the original spacing with the box and a space
       c.value = (isChecked ? "☑ " : "☐ ") + originalText.substring(2);
       c.font = { name: "Arial", size: 12, color: { argb: "FF000000" } };
       c.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
    };

    // Ensure left cells (margins) are completely empty
    worksheet.getCell("A" + (31 + shift)).value = null;
    worksheet.getCell("E" + (31 + shift)).value = null;
    worksheet.getCell("E" + (33 + shift)).value = null;

    setInlineCheck("B" + (31 + shift), true, "           Inspected, verified and found in order as ");

    const status = (iarData.acceptance_status || iarData.acceptanceStatus || "").toLowerCase();
    const isComplete = status === "complete" || status === "accepted" || status === "";
    const isPartial = status === "partial";
    
    setInlineCheck("F" + (31 + shift), isComplete, "           Complete ");
    setInlineCheck("F" + (33 + shift), isPartial, "            Partial (pls. specify quantity)");

    const inspBy = iarData.inspected_by || "JERRY B. RUBRICO";
    const inspDes = iarData.inspected_by_designation || "Administrative Officer II (Acting Property Custodian)";
    const accBy = iarData.accepted_by || "ARVINA S. VINUYA";
    const accDes = iarData.accepted_by_designation || "Administrative Officer III";
    const accDiv = iarData.accepted_by_division || "Office of the Secretary General";

    worksheet.getCell("B" + (37 + shift)).value = inspBy.toUpperCase();
    worksheet.getCell("B" + (38 + shift)).value = inspDes;
    worksheet.getCell("F" + (37 + shift)).value = accBy.toUpperCase();
    worksheet.getCell("F" + (38 + shift)).value = accDes;
    worksheet.getCell("F" + (39 + shift)).value = accDiv;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=IAR_Report_" + (iarData.iar_no || "export") + ".xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) { console.error("Excel Export Error:", error); res.status(500).json({ error: "Failed." }); }
};

const exportIarExcel = async (req, res) => {
  const { id } = req.params;
  try {
    const iarRes = await db.query("SELECT * FROM IAR_Records WHERE iar_id = $1", [id]);
    if (iarRes.rows.length === 0) return res.status(404).json({ error: "Not found." });
    const linesRes = await db.query("SELECT * FROM IAR_Line_Items WHERE iar_id = $1", [id]);
    const propsRes = await db.query("SELECT * FROM Property_Items WHERE iar_id = $1", [id]);
    const propMap = {}; propsRes.rows.forEach(p => { if (p.iar_line_id) { if (!propMap[p.iar_line_id]) propMap[p.iar_line_id] = { p: [], s: [] }; if (p.property_no) propMap[p.iar_line_id].p.push(p.property_no); if (p.serial_no) propMap[p.iar_line_id].s.push(p.serial_no); } });
    await buildExcelReport({ ...iarRes.rows[0], items: linesRes.rows.map(l => { const m = propMap[l.iar_line_id] || { p: [], s: [] }; return { item_name: l.item_description, property_no: m.p.join(", "), serial_no: m.s.join(", "), unit: l.unit, quantity: l.quantity }; }) }, res);
  } catch (error) { res.status(500).json({ error: "Failed." }); }
};

const previewIarExcel = async (req, res) => { await buildExcelReport(req.body, res); };

const getNextIarNo = async (req, res) => {
  try {
    const now = new Date(); const prefix = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    const result = await db.query("SELECT iar_no FROM IAR_Records WHERE iar_no LIKE $1 ORDER BY iar_id DESC LIMIT 1", [prefix + "-%"]);
    let n = 1; if (result.rows.length > 0) { const last = result.rows[0].iar_no; n = parseInt(last.split("-")[last.split("-").length - 1], 10) + 1; }
    res.json({ nextIarNo: prefix + "-" + String(n).padStart(3, "0") });
  } catch (error) { res.status(500).json({ error: "Failed." }); }
};

const exportParExcel = async (req, res) => {
  const { id } = req.params;
  try {
    const pRes = await db.query(`
      SELECT p.*, i.fund_cluster, i.po_pr_no, i.supplier_name
      FROM Property_Items p 
      LEFT JOIN IAR_Records i ON p.iar_id = i.iar_id 
      WHERE p.property_id = $1 AND p.type = 'PAR'`, [id]);
      
    if (pRes.rows.length === 0) return res.status(404).json({ error: "PAR item not found." });
    const prop = pRes.rows[0];

    const ExcelJS = require("exceljs"); const path = require("path"); const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(__dirname, "../par_template.xlsx"));
    const ws = workbook.worksheets[0];
    const formatDate = (dateStr) => { if (!dateStr) return ""; const d = new Date(dateStr); if (isNaN(d.getTime())) return ""; return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }); };

    ws.getCell("D10").value = prop.rco || "National Office"; 
    ws.getCell("K10").value = formatDate(prop.delivery_date);
    ws.getCell("B11").value = "Fund Cluster: " + (prop.fund_cluster || "");
    ws.getCell("K11").value = prop.property_no;

    ws.getCell("B15").value = "1";
    ws.getCell("C15").value = "unit";
    ws.getCell("D15").value = prop.item_name + (prop.description ? " (" + prop.description + ")" : "") + (prop.serial_no ? " SN: " + prop.serial_no : "");
    ws.getCell("H15").value = prop.property_no;
    ws.getCell("I15").value = formatDate(prop.delivery_date);
    ws.getCell("J15").value = parseFloat(prop.unit_cost) || 0;

    for(let r=16; r<=25; r++) {
       ws.getCell("B"+r).value = null; ws.getCell("C"+r).value = null; ws.getCell("D"+r).value = null;
       ws.getCell("H"+r).value = null; ws.getCell("I"+r).value = null; ws.getCell("J"+r).value = null;
    }

    ws.getCell("B39").value = prop.accountable_officer ? prop.accountable_officer.toUpperCase() : "";
    ws.getCell("H39").value = "JERRY B. RUBRICO";

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=PAR_" + prop.property_no + ".xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) { console.error("PAR Export Error:", error); res.status(500).json({ error: "Failed." }); }
};

const exportIcsExcel = async (req, res) => {
  const { id } = req.params;
  try {
    const pRes = await db.query(`
      SELECT p.*, i.fund_cluster, i.po_pr_no, i.supplier_name
      FROM Property_Items p 
      LEFT JOIN IAR_Records i ON p.iar_id = i.iar_id 
      WHERE p.property_id = $1 AND p.type = 'ICS'`, [id]);
      
    if (pRes.rows.length === 0) return res.status(404).json({ error: "ICS item not found." });
    const prop = pRes.rows[0];

    const ExcelJS = require("exceljs"); const path = require("path"); const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(__dirname, "../ics_template.xlsx"));
    const ws = workbook.worksheets[0];
    const formatDate = (dateStr) => { if (!dateStr) return ""; const d = new Date(dateStr); if (isNaN(d.getTime())) return ""; return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }); };

    ws.getCell("B10").value = "Entity Name: " + (prop.rco || "Boy Scouts of the Philippines");
    ws.getCell("I10").value = formatDate(prop.delivery_date);
    ws.getCell("B11").value = "Fund Cluster: " + (prop.fund_cluster || "");
    ws.getCell("I11").value = prop.property_no; 

    ws.getCell("B16").value = "1";
    ws.getCell("C16").value = "unit";
    ws.getCell("D16").value = parseFloat(prop.unit_cost) || 0; 
    ws.getCell("E16").value = parseFloat(prop.unit_cost) || 0; 
    ws.getCell("F16").value = prop.item_name + (prop.description ? " (" + prop.description + ")" : "") + (prop.serial_no ? " SN: " + prop.serial_no : "");
    ws.getCell("H16").value = prop.property_no;
    ws.getCell("I16").value = "5 years";

    for(let r=17; r<=21; r++) {
       ws.getCell("B"+r).value = null; ws.getCell("C"+r).value = null; ws.getCell("D"+r).value = null;
       ws.getCell("E"+r).value = null; ws.getCell("F"+r).value = null; ws.getCell("H"+r).value = null; ws.getCell("I"+r).value = null;
    }

    ws.getCell("B26").value = prop.accountable_officer ? prop.accountable_officer.toUpperCase() : "";
    ws.getCell("G26").value = "JERRY B. RUBRICO";

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=ICS_" + prop.property_no + ".xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) { console.error("ICS Export Error:", error); res.status(500).json({ error: "Failed." }); }
};

const exportPhysicalCountExcel = async (req, res) => {
  const { reportType, employee } = req.query;
  const classification = reportType === 'RPCPPE' ? 'PAR' : 'ICS';
  
  try {
    let q = 'SELECT p.*, o.office_name FROM Property_Items p LEFT JOIN Offices o ON p.office_id = o.office_id WHERE p.type = $1 AND p.status != \'RETURNED\'';
    const params = [classification];
    if (employee && employee !== 'ALL') { params.push(employee); q += ' AND p.accountable_officer = $2'; }
    q += ' ORDER BY p.accountable_officer ASC, p.property_no ASC';
    
    const pRes = await db.query(q, params);
    
    const ExcelJS = require('exceljs'); const path = require('path'); const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(__dirname, '../rpcppe_template.xlsx'));
    const ws = workbook.worksheets[0];
    const formatDate = (dateStr) => { if (!dateStr) return ''; const d = new Date(dateStr); if (isNaN(d.getTime())) return ''; return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }); };

    const year = new Date().getFullYear();
    const title = reportType === 'RPCPPE' ? 'REPORT ON THE PHYSICAL COUNT OF PROPERTY, PLANT AND EQUIPMENT (RPCPPE)' : 'REPORT ON THE PHYSICAL COUNT OF SEMI-EXPENDABLE PROPERTY (RPCSP)';
    ws.getCell('A6').value = year + ' ' + title;
    ws.getCell('A9').value = 'as of ' + formatDate(new Date());

    if (employee && employee !== 'ALL') {
       ws.getCell('B12').value = 'For which: ' + employee.toUpperCase() + ' is accountable.';
    } else {
       ws.getCell('B12').value = 'For All Accountable Officers';
    }

    const items = pRes.rows;
    const requiredRowsCount = items.length;
    let shift = 0;
    
    // Template items start at Row 17. The template has around 14 item rows (17-30).
    const templateRowsCount = 14; 
    
    if (requiredRowsCount > templateRowsCount) {
      shift = requiredRowsCount - templateRowsCount;
      ws.insertRows(31, new Array(shift).fill([]), 'o');
    }

    // Clear existing values in item rows
    for(let r=17; r <= 30 + shift; r++) {
       ws.getCell("B"+r).value = null; ws.getCell("C"+r).value = null; ws.getCell("F"+r).value = null;
       ws.getCell("G"+r).value = null; ws.getCell("H"+r).value = null; ws.getCell("I"+r).value = null;
       ws.getCell("J"+r).value = null; ws.getCell("L"+r).value = null;
    }

    items.forEach((item, idx) => {
      const rNum = 17 + idx;
      ws.getCell('B'+rNum).value = item.item_name || '';
      ws.getCell('C'+rNum).value = item.description || (item.serial_no ? 'SN: ' + item.serial_no : '');
      ws.getCell('F'+rNum).value = item.property_no || '';
      ws.getCell('G'+rNum).value = formatDate(item.delivery_date) || '';
      ws.getCell('H'+rNum).value = 'unit';
      ws.getCell('I'+rNum).value = 'Purchase';
      ws.getCell('J'+rNum).value = parseFloat(item.unit_cost) || 0;
      ws.getCell('L'+rNum).value = 1;
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=' + reportType + '_Report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) { console.error('Physical Count Export Error:', error); res.status(500).json({ error: 'Failed to export physical count.' }); }
};

const exportPtrExcel = async (req, res) => {
  const { id } = req.params;
  try {
    const pRes = await db.query('SELECT p.*, t.ptr_no, t.from_officer, t.to_officer, t.reason FROM Property_Transfers t JOIN Property_Items p ON t.property_id = p.property_id WHERE t.transfer_id = $1', [id]);
    
    if (pRes.rows.length === 0) return res.status(404).json({ error: 'Transfer record not found.' });
    const prop = pRes.rows[0];

    const ExcelJS = require('exceljs'); const path = require('path'); const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(__dirname, '../ptr_template.xlsx'));
    const ws = workbook.worksheets[0];
    const formatDate = (dateStr) => { if (!dateStr) return ''; const d = new Date(dateStr); if (isNaN(d.getTime())) return ''; return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); };

    ws.getCell('D6').value = 'Boy Scouts of the Philippines';
    ws.getCell('J8').value = prop.from_officer ? prop.from_officer.toUpperCase() : '';
    ws.getCell('J9').value = prop.to_officer ? prop.to_officer.toUpperCase() : '';
    
    // Checkbox relocation for transfer
    ws.getCell('E14').value = '☑ Reassignment';

    ws.getCell('C19').value = formatDate(prop.delivery_date);
    ws.getCell('D19').value = prop.property_no;
    ws.getCell('F19').value = 1;
    ws.getCell('G19').value = 'unit';
    ws.getCell('H19').value = prop.item_name + (prop.description ? ' (' + prop.description + ')' : '') + (prop.serial_no ? ' SN: ' + prop.serial_no : '');

    ws.getCell('C30').value = prop.reason || 'Transfer of equipment.';

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=PTR_' + prop.property_no + '.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) { console.error('PTR Export Error:', error); res.status(500).json({ error: 'Failed.' }); }
};

module.exports = { createIar, getAllProperties, getPropertyDetails, createPropertyTransfer, createPropertyReturn, getPropertyReportsCount, getPropertyAnalytics, getAllIars, getIarDetails, exportIarExcel, previewIarExcel, getNextIarNo, exportParExcel, exportIcsExcel, exportPhysicalCountExcel, exportPtrExcel };
