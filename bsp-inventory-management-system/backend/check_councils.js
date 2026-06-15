const db = require('./db');

async function run() {
    try {
        const res = await db.query("SELECT employee_id, full_name, designation FROM Employees WHERE full_name ILIKE '%council%' OR designation ILIKE '%council%'");
        console.log("Matching 'council':", res.rows);
        
        // Also let's just see all designations to find out if there's a specific "Local Council" office.
        const res2 = await db.query("SELECT DISTINCT designation FROM Employees");
        console.log("All distinct designations:", res2.rows.map(r => r.designation).filter(d => d && d.toLowerCase().includes('council')));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();