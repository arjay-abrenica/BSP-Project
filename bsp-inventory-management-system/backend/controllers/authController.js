const db = require('../db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_bsp_key_123';

exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    // For now, doing direct comparison as per database.sql (where password is 'admin123' in plain text).
    // In production, you would use bcrypt.compare(password, user.password)
    const result = await db.query('SELECT * FROM Users WHERE username = $1', [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Replace this with bcrypt comparison if passwords become hashed in the future
    if (user.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.user_id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.user_id,
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};
