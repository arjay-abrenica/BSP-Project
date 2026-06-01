const db = require('../db');
const bcrypt = require('bcryptjs');

exports.getAllUsers = async (req, res) => {
  try {
    const result = await db.query('SELECT user_id, username, email, office, role, status, created_at FROM Users ORDER BY user_id ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
};

exports.createUser = async (req, res) => {
  const { username, password, email, office, role, status } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    // Check if role is SUPERADMIN and if one already exists
    if (role === 'SUPERADMIN') {
      const checkSuper = await db.query('SELECT * FROM Users WHERE role = \'SUPERADMIN\'');
      if (checkSuper.rows.length > 0) {
        return res.status(400).json({ message: 'A SUPERADMIN already exists. Only one SUPERADMIN is allowed.' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // For SUPPLY_OFFICER and SUPERADMIN, office is not applicable
    const finalOffice = (role === 'SUPPLY_OFFICER' || role === 'SUPERADMIN') ? 'N/A' : (office || 'N/A');

    const result = await db.query(
      'INSERT INTO Users (username, password, email, office, role, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING user_id, username, role',
      [username, hashedPassword, email, finalOffice, role || 'STAFF', status || 'Active']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.code === '23505') { // Unique violation
        return res.status(400).json({ message: 'Username already exists' });
    }
    res.status(500).json({ message: 'Server error while creating user' });
  }
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { username, email, office, role, status } = req.body;
  try {
    // Check if updating to SUPERADMIN and if another one already exists
    if (role === 'SUPERADMIN') {
      const checkSuper = await db.query('SELECT * FROM Users WHERE role = \'SUPERADMIN\' AND user_id != $1', [id]);
      if (checkSuper.rows.length > 0) {
        return res.status(400).json({ message: 'A SUPERADMIN already exists. Only one SUPERADMIN is allowed.' });
      }
    }

    // For SUPPLY_OFFICER and SUPERADMIN, office is not applicable
    const finalOffice = (role === 'SUPPLY_OFFICER' || role === 'SUPERADMIN') ? 'N/A' : (office || 'N/A');

    const result = await db.query(
      'UPDATE Users SET username = $1, email = $2, office = $3, role = $4, status = $5 WHERE user_id = $6 RETURNING *',
      [username, email, finalOffice, role, status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error while updating user' });
  }
};

exports.changePassword = async (req, res) => {
  const { id } = req.params;
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: 'Old and new passwords are required' });
  }

  try {
    const userRes = await db.query('SELECT * FROM Users WHERE user_id = $1', [id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userRes.rows[0];
    
    // Check old password
    let isMatch = false;
    try {
        isMatch = await bcrypt.compare(oldPassword, user.password);
    } catch (e) {
        // Fallback for plain text passwords in sample data
        isMatch = (oldPassword === user.password);
    }

    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect old password' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE Users SET password = $1 WHERE user_id = $2', [hashedPassword, id]);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Server error while changing password' });
  }
};

exports.resetPassword = async (req, res) => {
  const { id } = req.params;
  const defaultPassword = 'BSPLagingHanda';

  try {
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    const result = await db.query('UPDATE Users SET password = $1 WHERE user_id = $2 RETURNING user_id, username', [hashedPassword, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: `Password reset successfully to the default password: ${defaultPassword}` });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Server error while resetting password' });
  }
};
