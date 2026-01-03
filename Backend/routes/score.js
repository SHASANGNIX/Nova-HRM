// backend/routes/score.js
const express = require('express');
const router = express.Router();
const { verifyToken, verifyHR } = require('./auth');

// Calculate daily score for an employee
async function calculateDailyScore(db, employeeId, date) {
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  // Get attendance (max 40 points)
  const attendance = await db.query(
    'SELECT * FROM attendance WHERE employee_id = $1 AND date = $2',
    [employeeId, targetDate]
  );
  
  let attendanceScore = 0;
  if (attendance.rows.length > 0) {
    const record = attendance.rows[0];
    if (record.status === 'Present') {
      attendanceScore = 40;
    } else if (record.status === 'Late') {
      attendanceScore = 30;
    } else if (record.status === 'Leave') {
      attendanceScore = 20;
    }
  }

  // Get tasks completion for the month (max 40 points)
  const tasks = await db.query(
    `SELECT * FROM tasks 
     WHERE employee_id = $1 
     AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM $2::date)
     AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM $2::date)`,
    [employeeId, targetDate]
  );

  let taskScore = 0;
  if (tasks.rows.length > 0) {
    const completed = tasks.rows.filter(t => t.status === 'Completed').length;
    const percentage = (completed / tasks.rows.length) * 100;
    taskScore = (percentage / 100) * 40;
  } else {
    taskScore = 40; // No tasks means no penalty
  }

  // Punctuality (max 20 points) - based on late logins in the month
  const lateCount = await db.query(
    `SELECT COUNT(*) as count FROM attendance 
     WHERE employee_id = $1 
     AND is_late = true
     AND EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM $2::date)
     AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM $2::date)`,
    [employeeId, targetDate]
  );

  const lateLogins = parseInt(lateCount.rows[0].count);
  let punctualityScore = 20;
  if (lateLogins > 0) {
    punctualityScore = Math.max(0, 20 - (lateLogins * 2));
  }

  const totalScore = attendanceScore + taskScore + punctualityScore;

  return {
    attendanceScore: parseFloat(attendanceScore.toFixed(2)),
    taskScore: parseFloat(taskScore.toFixed(2)),
    punctualityScore: parseFloat(punctualityScore.toFixed(2)),
    totalScore: parseFloat(totalScore.toFixed(2))
  };
}

// Get employee's today score
router.get('/today', verifyToken, async (req, res) => {
  const db = req.app.locals.db;
  const employeeId = req.user.employeeId;
  const today = new Date().toISOString().split('T')[0];

  try {
    // Check if score already calculated today
    let score = await db.query(
      'SELECT * FROM scores WHERE employee_id = $1 AND date = $2',
      [employeeId, today]
    );

    if (score.rows.length === 0) {
      // Calculate score
      const calculated = await calculateDailyScore(db, employeeId, today);
      
      // Save score
      score = await db.query(
        `INSERT INTO scores (employee_id, date, attendance_score, task_score, punctuality_score, total_score)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [employeeId, today, calculated.attendanceScore, calculated.taskScore, calculated.punctualityScore, calculated.totalScore]
      );

      // Generate warning if score < 40
      if (calculated.totalScore < 40) {
        await db.query(
          `INSERT INTO warnings (employee_id, warning_type, message, score)
           VALUES ($1, $2, $3, $4)`,
          [employeeId, 'Low Performance', 'Daily performance score below 40', calculated.totalScore]
        );
      }
    }

    res.json(score.rows[0]);
  } catch (error) {
    console.error('Get today score error:', error);
    res.status(500).json({ error: 'Failed to get score' });
  }
});

// Get employee's score history
router.get('/history', verifyToken, async (req, res) => {
  const db = req.app.locals.db;
  const employeeId = req.user.employeeId;
  const { month, year, limit = 30 } = req.query;

  try {
    let query = 'SELECT * FROM scores WHERE employee_id = $1';
    const params = [employeeId];

    if (month && year) {
      query += ' AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3';
      params.push(month, year);
    }

    query += ' ORDER BY date DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await db.query(query, params);

    // Calculate average
    const avg = result.rows.length > 0
      ? result.rows.reduce((sum, s) => sum + parseFloat(s.total_score), 0) / result.rows.length
      : 0;

    res.json({
      scores: result.rows,
      average: parseFloat(avg.toFixed(2))
    });
  } catch (error) {
    console.error('Get score history error:', error);
    res.status(500).json({ error: 'Failed to get score history' });
  }
});

// Get employee warnings
router.get('/warnings', verifyToken, async (req, res) => {
  const db = req.app.locals.db;
  const employeeId = req.user.employeeId;

  try {
    const result = await db.query(
      'SELECT * FROM warnings WHERE employee_id = $1 ORDER BY created_at DESC LIMIT 10',
      [employeeId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get warnings error:', error);
    res.status(500).json({ error: 'Failed to get warnings' });
  }
});

// HR: Get all employees scores
router.get('/all', verifyToken, verifyHR, async (req, res) => {
  const db = req.app.locals.db;
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    const result = await db.query(`
      SELECT 
        s.*,
        e.name,
        e.department,
        e.designation
      FROM scores s
      JOIN employees e ON s.employee_id = e.id
      WHERE s.date = $1
      ORDER BY s.total_score DESC
    `, [targetDate]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get all scores error:', error);
    res.status(500).json({ error: 'Failed to get scores' });
  }
});

// HR: Get employee score analytics
router.get('/analytics/:employeeId', verifyToken, verifyHR, async (req, res) => {
  const db = req.app.locals.db;
  const { employeeId } = req.params;
  const { month, year } = req.query;

  try {
    let query = 'SELECT * FROM scores WHERE employee_id = $1';
    const params = [employeeId];

    if (month && year) {
      query += ' AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3';
      params.push(month, year);
    }

    query += ' ORDER BY date DESC';

    const scores = await db.query(query, params);
    const warnings = await db.query(
      'SELECT * FROM warnings WHERE employee_id = $1 ORDER BY created_at DESC LIMIT 5',
      [employeeId]
    );

    // Calculate statistics
    const avg = scores.rows.length > 0
      ? scores.rows.reduce((sum, s) => sum + parseFloat(s.total_score), 0) / scores.rows.length
      : 0;

    const highest = scores.rows.length > 0
      ? Math.max(...scores.rows.map(s => parseFloat(s.total_score)))
      : 0;

    const lowest = scores.rows.length > 0
      ? Math.min(...scores.rows.map(s => parseFloat(s.total_score)))
      : 0;

    res.json({
      scores: scores.rows,
      warnings: warnings.rows,
      stats: {
        average: parseFloat(avg.toFixed(2)),
        highest: parseFloat(highest.toFixed(2)),
        lowest: parseFloat(lowest.toFixed(2)),
        total: scores.rows.length
      }
    });
  } catch (error) {
    console.error('Get score analytics error:', error);
    res.status(500).json({ error: 'Failed to get score analytics' });
  }
});

// HR: Get best employee of the month
router.get('/best-employee', verifyToken, verifyHR, async (req, res) => {
  const db = req.app.locals.db;
  const { month, year } = req.query;
  const currentMonth = month || new Date().getMonth() + 1;
  const currentYear = year || new Date().getFullYear();

  try {
    const result = await db.query(`
      SELECT 
        e.id,
        e.name,
        e.department,
        e.designation,
        AVG(s.total_score) as average_score,
        COUNT(s.id) as days_recorded
      FROM employees e
      JOIN scores s ON e.id = s.employee_id
      WHERE EXTRACT(MONTH FROM s.date) = $1
      AND EXTRACT(YEAR FROM s.date) = $2
      GROUP BY e.id, e.name, e.department, e.designation
      HAVING COUNT(s.id) >= 15
      ORDER BY average_score DESC
      LIMIT 1
    `, [currentMonth, currentYear]);

    if (result.rows.length === 0) {
      return res.json({ message: 'No best employee found for this month' });
    }

    res.json({
      ...result.rows[0],
      average_score: parseFloat(result.rows[0].average_score).toFixed(2)
    });
  } catch (error) {
    console.error('Get best employee error:', error);
    res.status(500).json({ error: 'Failed to get best employee' });
  }
});

// HR: Recalculate all scores for a date
router.post('/recalculate', verifyToken, verifyHR, async (req, res) => {
  const db = req.app.locals.db;
  const { date } = req.body;
  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    // Get all employees
    const employees = await db.query('SELECT id FROM employees');

    for (const employee of employees.rows) {
      const calculated = await calculateDailyScore(db, employee.id, targetDate);

      // Delete existing score
      await db.query(
        'DELETE FROM scores WHERE employee_id = $1 AND date = $2',
        [employee.id, targetDate]
      );

      // Insert new score
      await db.query(
        `INSERT INTO scores (employee_id, date, attendance_score, task_score, punctuality_score, total_score)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [employee.id, targetDate, calculated.attendanceScore, calculated.taskScore, calculated.punctualityScore, calculated.totalScore]
      );
    }

    res.json({ message: 'Scores recalculated successfully' });
  } catch (error) {
    console.error('Recalculate scores error:', error);
    res.status(500).json({ error: 'Failed to recalculate scores' });
  }
});

module.exports = router;