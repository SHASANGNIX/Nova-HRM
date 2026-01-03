const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// DB pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production" || process.env.VERCEL
      ? { rejectUnauthorized: false }
      : false,
});

app.locals.db = pool;

// Routes (MATCH FOLDER NAME EXACTLY)
const authRoutes = require("../backend/routes/auth");
const attendanceRoutes = require("../backend/routes/attendance");
const taskRoutes = require("../backend/routes/task");
const leaveRoutes = require("../backend/routes/leave");
const salaryRoutes = require("../backend/routes/salary");
const scoreRoutes = require("../backend/routes/score");

app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/salary", salaryRoutes);
app.use("/api/scores", scoreRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date() });
});

// Export for Vercel serverless function
module.exports = app;
