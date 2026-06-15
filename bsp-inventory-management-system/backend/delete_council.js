const db = require('./db');

async function run() {
    try {
        const res = await db.query("DELETE FROM Employees WHERE full_name ILIKE '%local council%'");
        console.log("Deleted count:", res.rowCount);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();