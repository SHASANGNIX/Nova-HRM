// backend/routes/salary.js
const express = require('express');
const router = express.Router();
const { verifyToken, verifyHR } = require('./auth');

// Get employee's own salary
router.get('/my-salary', verifyToken, async (req, res) => {
  const db = req.app.locals.db;
  const employeeId = req.user.employeeId;

  try {
    const result = await db.query(
      'SELECT * FROM salary WHERE employee_id = $1',
      [employeeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Salary information not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get salary error:', error);
    res.status(500).json({ error: 'Failed to get salary information' });
  }
});

// HR: Get all employees salaries
router.get('/all', verifyToken, verifyHR, async (req, res) => {
  const db = req.app.locals.db;

  try {
    const result = await db.query(`
      SELECT 
        s.*,
        e.name,
        e.department,
        e.designation
      FROM salary s
      JOIN employees e ON s.employee_id = e.id
      ORDER BY e.name ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get all salaries error:', error);
    res.status(500).json({ error: 'Failed to get salary information' });
  }
});

// HR: Get specific employee salary
router.get('/employee/:employeeId', verifyToken, verifyHR, async (req, res) => {
  const db = req.app.locals.db;
  const { employeeId } = req.params;

  try {
    const result = await db.query(`
      SELECT 
        s.*,
        e.name,
        e.department,
        e.designation
      FROM salary s
      JOIN employees e ON s.employee_id = e.id
      WHERE s.employee_id = $1
    `, [employeeId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Salary information not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get employee salary error:', error);
    res.status(500).json({ error: 'Failed to get salary information' });
  }
});

// HR: Update employee salary
router.put('/employee/:employeeId', verifyToken, verifyHR, async (req, res) => {
  const db = req.app.locals.db;
  const { employeeId } = req.params;
  const { basicSalary, allowances, deductions } = req.body;

  try {
    const netSalary = (parseFloat(basicSalary) + parseFloat(allowances || 0) - parseFloat(deductions || 0));

    const result = await db.query(
      `UPDATE salary 
       SET basic_salary = $1, allowances = $2, deductions = $3, net_salary = $4, updated_at = $5
       WHERE employee_id = $6
       RETURNING *`,
      [basicSalary, allowances || 0, deductions || 0, netSalary, new Date(), employeeId]
    );

    if (result.rows.length === 0) {
      // If salary doesn't exist, create it
      const insertResult = await db.query(
        'INSERT INTO salary (employee_id, basic_salary, allowances, deductions, net_salary) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [employeeId, basicSalary, allowances || 0, deductions || 0, netSalary]
      );
      return res.json(insertResult.rows[0]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update salary error:', error);
    res.status(500).json({ error: 'Failed to update salary' });
  }
});

// HR: Get salary statistics
router.get('/stats', verifyToken, verifyHR, async (req, res) => {
  const db = req.app.locals.db;

  try {
    const result = await db.query(`
      SELECT 
        COUNT(*) as total_employees,
        SUM(net_salary) as total_payroll,
        AVG(net_salary) as average_salary,
        MAX(net_salary) as highest_salary,
        MIN(net_salary) as lowest_salary
      FROM salary
    `);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get salary stats error:', error);
    res.status(500).json({ error: 'Failed to get salary statistics' });
  }
});

module.exports = router;