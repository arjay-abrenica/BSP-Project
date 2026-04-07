const db = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'bsp_inventory_secret_key_2026';

exports.login = async (req, res) => {
  let { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  // Trim whitespace and handle casing for the search
  username = username.trim();

  try {
    // Case-insensitive search
    const result = await db.query('SELECT * FROM Users WHERE TRIM(LOWER(username)) = LOWER($1)', [username]);

    if (result.rows.length === 0) {
      console.log(`Login failed: Username "${username}" not found.`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Try bcrypt comparison
    let isMatch = false;
    try {
        isMatch = await bcrypt.compare(password, user.password);
    } catch (e) {
        console.error('Bcrypt error:', e.message);
        // Fallback for plain text passwords in sample data
        isMatch = (user.password === password);
    }

    // Double check plain text if bcrypt failed (for transition)
    if (!isMatch && user.password === password) {
        isMatch = true;
        // Auto-upgrade this user to a hashed password
        const newHash = await bcrypt.hash(password, 10);
        await db.query('UPDATE Users SET password = $1 WHERE user_id = $2', [newHash, user.user_id]);
        console.log(`Auto-upgraded password for user "${user.username}" to hashed.`);
    }

    if (!isMatch) {
      console.log(`Login failed: Incorrect password for user "${username}".`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.user_id, username: user.username, role: user.role, office: user.office },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    console.log(`Login successful: User "${user.username}" logged in.`);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role,
        office: user.office,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};
