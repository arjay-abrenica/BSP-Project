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

const app = express();
const path = require('path');

// --- Middleware ---
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api', inventoryRoutes);

// DEBUG: Print all registered routes
console.log('--- Registered Routes ---');
app._router.stack.forEach((middleware) => {
  if (middleware.route) { // routes registered directly on the app
    console.log(`${Object.keys(middleware.route.methods)} ${middleware.route.path}`);
  } else if (middleware.name === 'router') { // router HTTP layer
    middleware.handle.stack.forEach((handler) => {
      route = handler.route;
      route && console.log(`${Object.keys(route.methods)} ${middleware.regexp} ${route.path}`);
    });
  }
});
console.log('-------------------------');

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
