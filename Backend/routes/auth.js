// backend/routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = express.Router();

// JWT Secret (use environment variable in production)
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Middleware to verify HR role
const verifyHR = (req, res, next) => {
  if (req.user.role !== "HR") {
    return res.status(403).json({ error: "Access denied. HR only." });
  }
  next();
};

// Register User (HR can create employees)
router.post("/register", verifyToken, verifyHR, async (req, res) => {
  const {
    email,
    password,
    role,
    name,
    department,
    designation,
    joinDate,
    basicSalary,
  } = req.body;
  const db = req.app.locals.db;

  try {
    // Check if user already exists
    const existingUser = await db.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const userResult = await db.query(
      "INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id, email, role",
      [email, hashedPassword, role]
    );

    const userId = userResult.rows[0].id;

    // Insert employee details
    const employeeResult = await db.query(
      "INSERT INTO employees (user_id, name, department, designation, join_date) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [userId, name, department, designation, joinDate]
    );

    const employeeId = employeeResult.rows[0].id;

    // Initialize leave balance
    await db.query("INSERT INTO leave_balance (employee_id) VALUES ($1)", [
      employeeId,
    ]);

    // Insert salary
    if (basicSalary) {
      const netSalary = basicSalary;
      await db.query(
        "INSERT INTO salary (employee_id, basic_salary, net_salary) VALUES ($1, $2, $3)",
        [employeeId, basicSalary, netSalary]
      );
    }

    res.status(201).json({
      message: "User registered successfully",
      user: userResult.rows[0],
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const db = req.app.locals.db;

  try {
    // Find user
    const result = await db.query(
      "SELECT u.*, e.id as employee_id, e.name FROM users u LEFT JOIN employees e ON u.id = e.user_id WHERE u.email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Mark attendance automatically on login (for employees)
    if (user.role === "Employee" && user.employee_id) {
      const today = new Date().toISOString().split("T")[0];
      const loginTime = new Date().toTimeString().split(" ")[0];

      // Check if attendance already marked
      const attendanceCheck = await db.query(
        "SELECT * FROM attendance WHERE employee_id = $1 AND date = $2",
        [user.employee_id, today]
      );

      if (attendanceCheck.rows.length === 0) {
        // Get office start time
        const officeTime = await db.query(
          "SELECT office_start_time FROM employees WHERE id = $1",
          [user.employee_id]
        );

        const officeStartTime =
          officeTime.rows[0]?.office_start_time || "09:00:00";
        const isLate = loginTime > officeStartTime;

        // Insert attendance
        await db.query(
          "INSERT INTO attendance (employee_id, date, login_time, status, is_late) VALUES ($1, $2, $3, $4, $5)",
          [
            user.employee_id,
            today,
            loginTime,
            isLate ? "Late" : "Present",
            isLate,
          ]
        );
      }
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        employeeId: user.employee_id,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employeeId: user.employee_id,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Get Current User
router.get("/me", verifyToken, async (req, res) => {
  const db = req.app.locals.db;

  try {
    const result = await db.query(
      "SELECT u.id, u.email, u.role, e.id as employee_id, e.name, e.department, e.designation FROM users u LEFT JOIN employees e ON u.id = e.user_id WHERE u.id = $1",
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Failed to get user" });
  }
});

// Get all employees (HR only)
router.get("/employees", verifyToken, verifyHR, async (req, res) => {
  const db = req.app.locals.db;

  try {
    const result = await db.query(`
      SELECT u.id, u.email, u.role, e.id as employee_id, e.name, e.department, e.designation, e.join_date 
      FROM users u 
      INNER JOIN employees e ON u.id = e.user_id 
      WHERE u.role = 'Employee'
      ORDER BY e.name ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Get employees error:", error);
    res.status(500).json({ error: "Failed to get employees" });
  }
});

// Delete Employee (HR only)
router.delete(
  "/employees/:employeeId",
  verifyToken,
  verifyHR,
  async (req, res) => {
    const db = req.app.locals.db;
    const { employeeId } = req.params;

    try {
      // First check if employee exists
      const employeeCheck = await db.query(
        "SELECT u.id as user_id FROM employees e JOIN users u ON e.user_id = u.id WHERE e.id = $1",
        [employeeId]
      );

      if (employeeCheck.rows.length === 0) {
        return res.status(404).json({ error: "Employee not found" });
      }

      const userId = employeeCheck.rows[0].user_id;

      // Delete related records first (due to foreign key constraints)
      await db.query("DELETE FROM leave_balance WHERE employee_id = $1", [
        employeeId,
      ]);
      await db.query("DELETE FROM salary WHERE employee_id = $1", [employeeId]);
      await db.query("DELETE FROM attendance WHERE employee_id = $1", [
        employeeId,
      ]);
      await db.query(
        "DELETE FROM tasks WHERE employee_id = $1 OR assigned_by = $1",
        [employeeId]
      );
      await db.query(
        "DELETE FROM leaves WHERE employee_id = $1 OR approved_by = $1",
        [employeeId]
      );
      await db.query("DELETE FROM scores WHERE employee_id = $1", [employeeId]);

      // Delete employee record
      await db.query("DELETE FROM employees WHERE id = $1", [employeeId]);

      // Delete user record
      await db.query("DELETE FROM users WHERE id = $1", [userId]);

      res.json({ message: "Employee fired successfully" });
    } catch (error) {
      console.error("Delete employee error:", error);
      res.status(500).json({ error: "Failed to delete employee" });
    }
  }
);

// Export middleware for other routes
module.exports = router;
module.exports.verifyToken = verifyToken;
module.exports.verifyHR = verifyHR;
