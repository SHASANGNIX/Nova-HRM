// backend/routes/task.js
const express = require('express');
const router = express.Router();
const { verifyToken, verifyHR } = require('./auth');

// Get employee tasks (HR assigned)
router.get('/assigned', verifyToken, async (req, res) => {
  const db = req.app.locals.db;
  const employeeId = req.user.employeeId;

  try {
    const result = await db.query(`
      SELECT 
        t.*,
        e.name as assigned_by_name
      FROM tasks t
      LEFT JOIN employees e ON t.assigned_by = e.id
      WHERE t.employee_id = $1
      ORDER BY 
        CASE 
          WHEN t.status = 'Pending' THEN 1
          WHEN t.status = 'In Progress' THEN 2
          ELSE 3
        END,
        t.due_date ASC
    `, [employeeId]);

    // Calculate completion percentage
    const total = result.rows.length;
    const completed = result.rows.filter(t => t.status === 'Completed').length;
    const percentage = total > 0 ? ((completed / total) * 100).toFixed(2) : 0;

    res.json({
      tasks: result.rows,
      stats: {
        total,
        completed,
        pending: total - completed,
        percentage
      }
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

// Get personal tasks (to-do list)
router.get('/personal', verifyToken, async (req, res) => {
  const db = req.app.locals.db;
  const employeeId = req.user.employeeId;

  try {
    const result = await db.query(
      'SELECT * FROM personal_tasks WHERE employee_id = $1 ORDER BY created_at DESC',
      [employeeId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get personal tasks error:', error);
    res.status(500).json({ error: 'Failed to get personal tasks' });
  }
});

// Create personal task
router.post('/personal', verifyToken, async (req, res) => {
  const db = req.app.locals.db;
  const employeeId = req.user.employeeId;
  const { title, description } = req.body;

  try {
    const result = await db.query(
      'INSERT INTO personal_tasks (employee_id, title, description) VALUES ($1, $2, $3) RETURNING *',
      [employeeId, title, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create personal task error:', error);
    res.status(500).json({ error: 'Failed to create personal task' });
  }
});

// Update personal task status
router.put('/personal/:id', verifyToken, async (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;
  const { status } = req.body;
  const employeeId = req.user.employeeId;

  try {
    const completedAt = status === 'Completed' ? new Date() : null;

    const result = await db.query(
      'UPDATE personal_tasks SET status = $1, completed_at = $2 WHERE id = $3 AND employee_id = $4 RETURNING *',
      [status, completedAt, id, employeeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update personal task error:', error);
    res.status(500).json({ error: 'Failed to update personal task' });
  }
});

// Delete personal task
router.delete('/personal/:id', verifyToken, async (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;
  const employeeId = req.user.employeeId;

  try {
    await db.query(
      'DELETE FROM personal_tasks WHERE id = $1 AND employee_id = $2',
      [id, employeeId]
    );

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete personal task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Update HR assigned task status
router.put('/assigned/:id', verifyToken, async (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;
  const { status } = req.body;
  const employeeId = req.user.employeeId;

  try {
    const completedAt = status === 'Completed' ? new Date() : null;

    const result = await db.query(
      'UPDATE tasks SET status = $1, completed_at = $2 WHERE id = $3 AND employee_id = $4 RETURNING *',
      [status, completedAt, id, employeeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// HR: Assign task to employee
router.post('/assign', verifyToken, verifyHR, async (req, res) => {
  const db = req.app.locals.db;
  const { employeeId, title, description, priority, dueDate } = req.body;
  const assignedBy = req.user.employeeId;

  try {
    const result = await db.query(
      'INSERT INTO tasks (employee_id, assigned_by, title, description, priority, due_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [employeeId, assignedBy, title, description, priority, dueDate]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Assign task error:', error);
    res.status(500).json({ error: 'Failed to assign task' });
  }
});

// HR: Get all tasks
router.get('/all', verifyToken, verifyHR, async (req, res) => {
  const db = req.app.locals.db;

  try {
    const result = await db.query(`
      SELECT 
        t.*,
        e.name as employee_name,
        e.department,
        a.name as assigned_by_name
      FROM tasks t
      JOIN employees e ON t.employee_id = e.id
      LEFT JOIN employees a ON t.assigned_by = a.id
      ORDER BY t.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get all tasks error:', error);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

// HR: Get employee task statistics
router.get('/stats/:employeeId', verifyToken, verifyHR, async (req, res) => {
  const db = req.app.locals.db;
  const { employeeId } = req.params;

  try {
    const result = await db.query(
      'SELECT * FROM tasks WHERE employee_id = $1',
      [employeeId]
    );

    const total = result.rows.length;
    const completed = result.rows.filter(t => t.status === 'Completed').length;
    const pending = result.rows.filter(t => t.status === 'Pending').length;
    const inProgress = result.rows.filter(t => t.status === 'In Progress').length;
    const percentage = total > 0 ? ((completed / total) * 100).toFixed(2) : 0;

    res.json({
      total,
      completed,
      pending,
      inProgress,
      percentage,
      tasks: result.rows
    });
  } catch (error) {
    console.error('Get task stats error:', error);
    res.status(500).json({ error: 'Failed to get task statistics' });
  }
});

// HR: Delete task
router.delete('/assigned/:id', verifyToken, verifyHR, async (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;

  try {
    await db.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;