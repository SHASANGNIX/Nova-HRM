const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

async function checkEmployees() {
  const client = await pool.connect();

  try {
    console.log("🔍 Checking employees table...\n");

    // Check employees table
    const employees = await client.query("SELECT * FROM employees ORDER BY id");
    console.log("Employees table:");
    employees.rows.forEach((emp) => {
      console.log(
        `ID: ${emp.id}, user_id: ${emp.user_id}, name: ${emp.name}, department: ${emp.department}`
      );
    });

    console.log("\n🔍 Checking users table...\n");

    // Check users table
    const users = await client.query(
      "SELECT * FROM users WHERE role = $1 ORDER BY id",
      ["Employee"]
    );
    console.log("Users with Employee role:");
    users.rows.forEach((user) => {
      console.log(`ID: ${user.id}, email: ${user.email}, role: ${user.role}`);
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkEmployees();
