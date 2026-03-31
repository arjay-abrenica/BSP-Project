const db = require('../db');

exports.getSettings = async (req, res) => {
  try {
    const result = await db.query('SELECT setting_key, setting_value FROM System_Settings');
    const settings = {};
    result.rows.forEach(row => {
      let value = row.setting_value;
      if (value === 'true') value = true;
      if (value === 'false') value = false;
      settings[row.setting_key] = value;
    });
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Server error while fetching settings' });
  }
};

exports.updateSettings = async (req, res) => {
  const settings = req.body;
  try {
    for (const key in settings) {
      await db.query(
        'INSERT INTO System_Settings (setting_key, setting_value) VALUES ($1, $2) ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2',
        [key, String(settings[key])]
      );
    }
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Server error while updating settings' });
  }
};
