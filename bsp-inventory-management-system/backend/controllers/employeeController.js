const db = require('../db');

exports.getAllEmployees = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM Employees WHERE status = $1 ORDER BY full_name ASC', ['ACTIVE']);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching employees:', err);
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
};

exports.createEmployee = async (req, res) => {
    const { full_name, designation, office_id } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO Employees (full_name, designation, office_id) VALUES ($1, $2, $3) RETURNING *',
            [full_name, designation, office_id || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating employee:', err);
        res.status(500).json({ error: 'Failed to create employee' });
    }
};
