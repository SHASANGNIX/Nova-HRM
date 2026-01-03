// backend/routes/leave.js
const express = require('express');
const router = express.Router();
const { verifyToken, verifyHR } = require('./auth');

// Get employee leave balance
router.get('/balance', verifyToken, async (req, res) => {
  const db = req.app.locals.db;
  const employeeId = req.user.employeeId;

  try {
    const result = await db.query(
      'SELECT * FROM leave_balance WHERE employee_id = $1',
      [employeeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Leave balance not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get leave balance error:', error);
    res.status(500).json({ error: 'Failed to get leave balance' });
  }
});

// Get employee leave history
router.get('/history', verifyToken, async (req, res) => {
  const db = req.app.locals.db;
  const employeeId = req.user.employeeId;

  try {
    const result = await db.query(`
      SELECT 
        l.*,
        e.name as approved_by_name
      FROM leaves l
      LEFT JOIN employees e ON l.approved_by = e.id
      WHERE l.employee_id = $1
      ORDER BY l.created_at DESC
    `, [employeeId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get leave history error:', error);
    res.status(500).json({ error: 'Failed to get leave history' });
  }
});

// Apply for leave
router.post('/apply', verifyToken, async (req, res) => {
  const db = req.app.locals.db;
  const employeeId = req.user.employeeId;
  const { leaveType, startDate, endDate, reason } = req.body;

  try {
    // Check leave balance
    const balance = await db.query(
      'SELECT * FROM leave_balance WHERE employee_id = $1',
      [employeeId]
    );

    if (balance.rows.length === 0) {
      return res.status(404).json({ error: 'Leave balance not found' });
    }

    // Calculate number of days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Check if enough leaves available
    const currentBalance = balance.rows[0];
    if (leaveType === 'Paid' && currentBalance.paid_leaves < days) {
      return res.status(400).json({ error: 'Insufficient paid leaves' });
    }
    if (leaveType === 'Sick' && currentBalance.sick_leaves < days) {
      return res.status(400).json({ error: 'Insufficient sick leaves' });
    }

    // Check for overlapping leaves
    const overlap = await db.query(
      `SELECT * FROM leaves 
       WHERE employee_id = $1 
       AND status != 'Rejected'
       AND (
         (start_date <= $2 AND end_date >= $2) OR
         (start_date <= $3 AND end_date >= $3) OR
         (start_date >= $2 AND end_date <= $3)
       )`,
      [employeeId, startDate, endDate]
    );

    if (overlap.rows.length > 0) {
      return res.status(400).json({ error: 'Leave already applied for this period' });
    }

    // Insert leave application
    const result = await db.query(
      'INSERT INTO leaves (employee_id, leave_type, start_date, end_date, reason) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [employeeId, leaveType, startDate, endDate, reason]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Apply leave error:', error);
    res.status(500).json({ error: 'Failed to apply leave' });
  }
});

// Cancel leave (pending only)
router.delete('/:id', verifyToken, async (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;
  const employeeId = req.user.employeeId;

  try {
    const result = await db.query(
      'DELETE FROM leaves WHERE id = $1 AND employee_id = $2 AND status = $3 RETURNING *',
      [id, employeeId, 'Pending']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Leave not found or cannot be cancelled' });
    }

    res.json({ message: 'Leave cancelled successfully' });
  } catch (error) {
    console.error('Cancel leave error:', error);
    res.status(500).json({ error: 'Failed to cancel leave' });
  }
});

// HR: Get all leave requests
router.get('/all', verifyToken, verifyHR, async (req, res) => {
  const db = req.app.locals.db;
  const { status } = req.query;

  try {
    let query = `
      SELECT 
        l.*,
        e.name as employee_name,
        e.department,
        a.name as approved_by_name
      FROM leaves l
      JOIN employees e ON l.employee_id = e.id
      LEFT JOIN employees a ON l.approved_by = a.id
    `;

    if (status) {
      query += ' WHERE l.status = $1';
    }

    query += ' ORDER BY l.created_at DESC';

    const result = status 
      ? await db.query(query, [status])
      : await db.query(query);

    res.json(result.rows);
  } catch (error) {
    console.error('Get all leaves error:', error);
    res.status(500).json({ error: 'Failed to get leave requests' });
  }
});

// HR: Approve/Reject leave
router.put('/:id/status', verifyToken, verifyHR, async (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;
  const { status } = req.body; // 'Approved' or 'Rejected'
  const approvedBy = req.user.employeeId;

  try {
    // Get leave details
    const leave = await db.query('SELECT * FROM leaves WHERE id = $1', [id]);
    
    if (leave.rows.length === 0) {
      return res.status(404).json({ error: 'Leave not found' });
    }

    const leaveData = leave.rows[0];

    // Update leave status
    await db.query(
      'UPDATE leaves SET status = $1, approved_by = $2, approved_at = $3 WHERE id = $4',
      [status, approvedBy, new Date(), id]
    );

    // If approved, update leave balance and mark attendance
    if (status === 'Approved') {
      const start = new Date(leaveData.start_date);
      const end = new Date(leaveData.end_date);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

      // Update leave balance
      if (leaveData.leave_type === 'Paid') {
        await db.query(
          'UPDATE leave_balance SET paid_leaves = paid_leaves - $1, updated_at = $2 WHERE employee_id = $3',
          [days, new Date(), leaveData.employee_id]
        );
      } else if (leaveData.leave_type === 'Sick') {
        await db.query(
          'UPDATE leave_balance SET sick_leaves = sick_leaves - $1, updated_at = $2 WHERE employee_id = $3',
          [days, new Date(), leaveData.employee_id]
        );
      } else if (leaveData.leave_type === 'Unpaid') {
        await db.query(
          'UPDATE leave_balance SET unpaid_leaves = unpaid_leaves + $1, updated_at = $2 WHERE employee_id = $3',
          [days, new Date(), leaveData.employee_id]
        );
      }

      // Mark attendance as 'Leave' for each day
      const currentDate = new Date(start);
      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Check if attendance already exists
        const existing = await db.query(
          'SELECT * FROM attendance WHERE employee_id = $1 AND date = $2',
          [leaveData.employee_id, dateStr]
        );

        if (existing.rows.length === 0) {
          await db.query(
            'INSERT INTO attendance (employee_id, date, status) VALUES ($1, $2, $3)',
            [leaveData.employee_id, dateStr, 'Leave']
          );
        } else {
          await db.query(
            'UPDATE attendance SET status = $1 WHERE employee_id = $2 AND date = $3',
            ['Leave', leaveData.employee_id, dateStr]
          );
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    res.json({ message: `Leave ${status.toLowerCase()} successfully` });
  } catch (error) {
    console.error('Update leave status error:', error);
    res.status(500).json({ error: 'Failed to update leave status' });
  }
});

// HR: Get employee leave statistics
router.get('/stats/:employeeId', verifyToken, verifyHR, async (req, res) => {
  const db = req.app.locals.db;
  const { employeeId } = req.params;

  try {
    const leaves = await db.query(
      'SELECT * FROM leaves WHERE employee_id = $1',
      [employeeId]
    );

    const balance = await db.query(
      'SELECT * FROM leave_balance WHERE employee_id = $1',
      [employeeId]
    );

    const total = leaves.rows.length;
    const approved = leaves.rows.filter(l => l.status === 'Approved').length;
    const pending = leaves.rows.filter(l => l.status === 'Pending').length;
    const rejected = leaves.rows.filter(l => l.status === 'Rejected').length;

    res.json({
      balance: balance.rows[0] || {},
      stats: {
        total,
        approved,
        pending,
        rejected
      },
      leaves: leaves.rows
    });
  } catch (error) {
    console.error('Get leave stats error:', error);
    res.status(500).json({ error: 'Failed to get leave statistics' });
  }
});

// Get holidays
router.get('/holidays', verifyToken, async (req, res) => {
  const db = req.app.locals.db;

  try {
    const result = await db.query(
      'SELECT * FROM holidays ORDER BY date ASC'
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get holidays error:', error);
    res.status(500).json({ error: 'Failed to get holidays' });
  }
});

module.exports = router;