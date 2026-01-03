// backend/routes/attendance.js
const express = require('express');
const router = express.Router();
const { verifyToken, verifyHR } = require('./auth');

// Get today's attendance for employee
router.get('/today', verifyToken, async (req, res) => {
  const db = req.app.locals.db;
  const employeeId = req.user.employeeId;
  const today = new Date().toISOString().split('T')[0];

  try {
    const result = await db.query(
      'SELECT * FROM attendance WHERE employee_id = $1 AND date = $2',
      [employeeId, today]
    );

    if (result.rows.length === 0) {
      return res.json({ 
        status: 'Not Marked',
        message: 'Attendance not marked yet'
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Failed to get attendance' });
  }
});

// Get attendance history for employee
router.get('/history', verifyToken, async (req, res) => {
  const db = req.app.locals.db;
  const employeeId = req.user.employeeId;
  const { month, year } = req.query;

  try {
    let query = 'SELECT * FROM attendance WHERE employee_id = $1';
    const params = [employeeId];

    if (month && year) {
      query += ' AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3';
      params.push(month, year);
    }

    query += ' ORDER BY date DESC LIMIT 30';

    const result = await db.query(query, params);

    // Calculate statistics
    const total = result.rows.length;
    const present = result.rows.filter(r => r.status === 'Present' || r.status === 'Late').length;
    const absent = result.rows.filter(r => r.status === 'Absent').length;
    const late = result.rows.filter(r => r.is_late).length;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(2) : 0;

    res.json({
      records: result.rows,
      stats: {
        total,
        present,
        absent,
        late,
        percentage
      }
    });
  } catch (error) {
    console.error('Get attendance history error:', error);
    res.status(500).json({ error: 'Failed to get attendance history' });
  }
});

// Mark logout
router.post('/logout', verifyToken, async (req, res) => {
  const db = req.app.locals.db;
  const employeeId = req.user.employeeId;
  const today = new Date().toISOString().split('T')[0];
  const logoutTime = new Date().toTimeString().split(' ')[0];

  try {
    await db.query(
      'UPDATE attendance SET logout_time = $1 WHERE employee_id = $2 AND date = $3',
      [logoutTime, employeeId, today]
    );

    res.json({ message: 'Logout time recorded' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to record logout' });
  }
});

// HR: Get all employees attendance
router.get('/all', verifyToken, verifyHR, async (req, res) => {
  const db = req.app.locals.db;
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    const result = await db.query(`
      SELECT 
        a.*, 
        e.name, 
        e.department,
        e.designation
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.date = $1
      ORDER BY a.login_time ASC
    `, [targetDate]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get all attendance error:', error);
    res.status(500).json({ error: 'Failed to get attendance data' });
  }
});

// HR: Get employee attendance summary
router.get('/employee/:employeeId', verifyToken, verifyHR, async (req, res) => {
  const db = req.app.locals.db;
  const { employeeId } = req.params;
  const { month, year } = req.query;

  try {
    let query = `
      SELECT 
        a.*,
        e.name,
        e.department
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.employee_id = $1
    `;
    const params = [employeeId];

    if (month && year) {
      query += ' AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3';
      params.push(month, year);
    }

    query += ' ORDER BY date DESC';

    const result = await db.query(query, params);

    // Calculate statistics
    const total = result.rows.length;
    const present = result.rows.filter(r => r.status === 'Present' || r.status === 'Late').length;
    const absent = result.rows.filter(r => r.status === 'Absent').length;
    const late = result.rows.filter(r => r.is_late).length;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(2) : 0;

    res.json({
      records: result.rows,
      stats: {
        total,
        present,
        absent,
        late,
        percentage
      }
    });
  } catch (error) {
    console.error('Get employee attendance error:', error);
    res.status(500).json({ error: 'Failed to get employee attendance' });
  }
});

// HR: Manually mark attendance
router.post('/mark', verifyToken, verifyHR, async (req, res) => {
  const db = req.app.locals.db;
  const { employeeId, date, status, loginTime } = req.body;

  try {
    // Check if already marked
    const existing = await db.query(
      'SELECT * FROM attendance WHERE employee_id = $1 AND date = $2',
      [employeeId, date]
    );

    if (existing.rows.length > 0) {
      // Update existing
      await db.query(
        'UPDATE attendance SET status = $1, login_time = $2 WHERE employee_id = $3 AND date = $4',
        [status, loginTime, employeeId, date]
      );
    } else {
      // Insert new
      await db.query(
        'INSERT INTO attendance (employee_id, date, login_time, status) VALUES ($1, $2, $3, $4)',
        [employeeId, date, loginTime, status]
      );
    }

    res.json({ message: 'Attendance marked successfully' });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

module.exports = router;