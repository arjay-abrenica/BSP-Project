const db = require('../db');

exports.getAllUsers = async (req, res) => {
  try {
    const result = await db.query('SELECT user_id, username, email, office, role, status, created_at FROM Users ORDER BY user_id ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { username, email, office, role, status } = req.body;
  try {
    const result = await db.query(
      'UPDATE Users SET username = $1, email = $2, office = $3, role = $4, status = $5 WHERE user_id = $6 RETURNING *',
      [username, email, office, role, status, id]
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
