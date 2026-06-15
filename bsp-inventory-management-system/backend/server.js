const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// --- Configuration ---
dotenv.config(); // Load environment variables from .env
const db = require('./db');
const inventoryRoutes = require('./inventoryRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const employeeRoutes = require('./routes/employeeRoutes');

const app = express();
const path = require('path');

// --- Middleware ---
app.use(express.json({ limit: '50mb' })); // Increase limit for large PDF data
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({
  origin: 'http://localhost:4200',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
})); 
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- API Routes ---
// Endpoint to verify database connection status (unauthenticated health check)
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({ message: 'Database connection successful!', time: result.rows[0].now });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/property', propertyRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api', inventoryRoutes);

// --- System Health Checks ---

// Simple server status check
app.get('/', (req, res) => {
  res.send('Inventory Management System API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
