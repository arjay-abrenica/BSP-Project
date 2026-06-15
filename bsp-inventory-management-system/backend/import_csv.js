const fs = require('fs');
const path = require('path');
const db = require('./db');

async function importCSV() {
    const filePath = path.join(__dirname, 'employees.csv');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Simple CSV parser (assuming no quotes with commas inside, which is true for this simple file based on sample)
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');
    
    // Skip header
    const headers = lines.shift().split(',');

    console.log(`Found ${lines.length} rows to import.`);

    let successCount = 0;
    let errorCount = 0;

    try {
        // Clean the existing table
        await db.query('TRUNCATE TABLE Employees RESTART IDENTITY CASCADE');
        console.log('Successfully cleaned the Employees table.');

        for (const line of lines) {
            // Split by comma, handling potential simple quotes just in case, but simple split is mostly fine here.
            // A more robust regex for splitting CSV:
            const row = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
            // Actually, simple split(',') is safer if there are empty fields like ,,
            const columns = line.split(',');

            const firstName = columns[0] ? columns[0].trim() : '';
            const mi = columns[1] ? columns[1].trim() : '';
            const lastName = columns[2] ? columns[2].trim() : '';
            const email = columns[3] ? columns[3].trim() : '';
            const office = columns[4] ? columns[4].trim() : '';

            let fullNameParts = [];
            if (firstName) fullNameParts.push(firstName);
            if (mi) {
                fullNameParts.push(mi.endsWith('.') ? mi : `${mi}.`);
            }
            if (lastName) fullNameParts.push(lastName);

            const fullName = fullNameParts.join(' ').trim();

            if (!fullName) continue;

            await db.query(
                `INSERT INTO Employees (full_name, designation, status) 
                 VALUES ($1, $2, 'ACTIVE')`,
                [fullName, office]
            );
            successCount++;
        }
        
        console.log(`Import complete. Successfully inserted ${successCount} employees. Errors: ${errorCount}.`);
    } catch (err) {
        console.error('Error during import process:', err);
    } finally {
        process.exit(0);
    }
}

importCSV();
