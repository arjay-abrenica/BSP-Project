const xlsx = require('xlsx');
const path = require('path');
const db = require('./db');

async function importEmployees() {
    const filePath = path.join(__dirname, 'FINAL_BSP Employees & Offices Email Addresses.xlsx');
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    console.log(`Found ${data.length} rows. Importing...`);

    let successCount = 0;
    let errorCount = 0;

    // Skip the header row (index 0)
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        
        // Ensure the row has data
        if (!row || row.length === 0) continue;

        const firstName = row[0] ? String(row[0]).trim() : '';
        const mi = row[1] ? String(row[1]).trim() : '';
        const lastName = row[2] ? String(row[2]).trim() : '';
        const office = row[4] ? String(row[4]).trim() : '';

        // Construct full name (e.g., "Emilio B. Aquino" or "Marilou O. Palma")
        let fullNameParts = [];
        if (firstName) fullNameParts.push(firstName);
        if (mi) {
            // Ensure MI has a period if it doesn't already
            fullNameParts.push(mi.endsWith('.') ? mi : `${mi}.`);
        }
        if (lastName) fullNameParts.push(lastName);

        const fullName = fullNameParts.join(' ').trim();

        if (!fullName) continue; // Skip if no name

        try {
            // For now, mapping 'Division/Office' to 'designation' since there's no designation in the sheet,
            // or we can just leave it as their office association.
            await db.query(
                `INSERT INTO Employees (full_name, designation, status) 
                 VALUES ($1, $2, 'ACTIVE') 
                 ON CONFLICT DO NOTHING`, // Note: Assuming no unique constraint on full_name, but good practice
                [fullName, office]
            );
            successCount++;
        } catch (err) {
            console.error(`Error inserting ${fullName}:`, err.message);
            errorCount++;
        }
    }

    console.log(`Import complete. Successfully inserted ${successCount} employees. Errors: ${errorCount}.`);
    process.exit(0);
}

importEmployees();
