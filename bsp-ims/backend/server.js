const express = require('express');
const sql = require('mssql');
const cors = require('cors');
// Import dotenv to load variables from .env file
require('dotenv').config(); 

const app = express();
const port = process.env.DB_PORT || 3000;


// Middleware
app.use(cors()); 
app.use(express.json());

// --- Database Configuration using Environment Variables ---
// backend/server.js
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE, // This will be empty or undefined
    options: {
        encrypt: true, 
        trustServerCertificate: true, 
    }
};
// ...

// ... (connectToDatabase function and API routes)

// --- Database Connection Pool Setup ---
let pool;
async function connectToDatabase() {
    try {
        // Create the connection pool
        pool = await sql.connect(dbConfig);
        console.log('Connected to MS SQL Server successfully.');
    } catch (err) {
        console.error('Database connection failed:', err);
        // You can exit here if the connection is critical
        process.exit(1); 
    }
}

// --- API Route Example ---
// Use this route to test if Angular can fetch data
app.get('/api/test-connection', async (req, res) => {
    if (!pool) {
        return res.status(500).send({ message: 'Database connection not established.' });
    }

    try {
        const request = pool.request();
        
        // Query a system table (e.g., sys.databases) that exists in the master database
        const result = await request.query('SELECT name FROM sys.databases'); 
        
        // If successful, respond with a list of database names
        res.status(200).json({ 
            message: '✅ Connection to MS SQL Server successful!',
            databases: result.recordset.map(r => r.name)
        });
    } catch (err) {
        console.error('SQL Test Query error:', err);
        res.status(500).send({ message: 'Error executing test query on the server.' });
    }
});

// --- Server Startup ---
// Connect to the database first, then start the server
connectToDatabase().then(() => {
    app.listen(port, () => {
        console.log(`📡 Express server running at http://localhost:${port}`);
        console.log('Backend ready to receive requests from Angular.');
    });
});