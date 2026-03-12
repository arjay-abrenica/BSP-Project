const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// --- Configuration ---
dotenv.config(); // Load environment variables from .env
const db = require('./db');
const inventoryRoutes = require('./inventoryRoutes');

const app = express();

// --- Middleware ---
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cors()); // Enable Cross-Origin Resource Sharing

// --- API Routes ---
app.use('/api', inventoryRoutes);

// --- System Health Checks ---
// Endpoint to verify database connection status
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({ message: 'Database connection successful!', time: result.rows[0].now });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Simple server status check
app.get('/', (req, res) => {
  res.send('Inventory Management System API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
