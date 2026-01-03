const http = require("http");

// Function to login as HR and get token
function loginAsHR(callback) {
  console.log("🔄 Logging in as HR...\n");

  const data = JSON.stringify({
    email: "hr@dayflow.com",
    password: "password123",
  });

  const options = {
    hostname: "localhost",
    port: 5000,
    path: "/api/auth/login",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": data.length,
    },
  };

  const req = http.request(options, (res) => {
    let responseData = "";

    res.on("data", (chunk) => {
      responseData += chunk;
    });

    res.on("end", () => {
      if (res.statusCode === 200) {
        const response = JSON.parse(responseData);
        console.log("✅ HR login successful!");
        callback(null, response.token);
      } else {
        console.log("❌ HR login failed!");
        console.log("Status:", res.statusCode);
        console.log("Error:", responseData);
        callback(new Error("Login failed"));
      }
    });
  });

  req.on("error", (error) => {
    console.log("❌ Connection error:", error.message);
    callback(error);
  });

  req.write(data);
  req.end();
}

// Function to add new employee
function addEmployee(token) {
  console.log("\n🔄 Adding new employee...\n");

  // Employee data - you can modify these values
  const employeeData = {
    email: "newemployee@dayflow.com",
    password: "password123",
    role: "Employee",
    name: "Jane Smith",
    department: "Marketing",
    designation: "Marketing Specialist",
    joinDate: new Date().toISOString().split("T")[0], // Today's date
    basicSalary: 45000,
  };

  const data = JSON.stringify(employeeData);

  const options = {
    hostname: "localhost",
    port: 5000,
    path: "/api/auth/register",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": data.length,
      Authorization: `Bearer ${token}`,
    },
  };

  const req = http.request(options, (res) => {
    let responseData = "";

    res.on("data", (chunk) => {
      responseData += chunk;
    });

    res.on("end", () => {
      if (res.statusCode === 201) {
        console.log("✅ Employee added successfully!");
        console.log("\nEmployee Details:");
        console.log(`📧 Email: ${employeeData.email}`);
        console.log(`🔑 Password: ${employeeData.password}`);
        console.log(`👤 Name: ${employeeData.name}`);
        console.log(`🏢 Department: ${employeeData.department}`);
        console.log(`💼 Designation: ${employeeData.designation}`);
        console.log(`💰 Basic Salary: $${employeeData.basicSalary}`);
        console.log(`📅 Join Date: ${employeeData.joinDate}`);
      } else {
        console.log("❌ Failed to add employee!");
        console.log("Status:", res.statusCode);
        console.log("Error:", responseData);
      }
    });
  });

  req.on("error", (error) => {
    console.log("❌ Connection error:", error.message);
  });

  req.write(data);
  req.end();
}

// Main execution
console.log("🚀 Adding new employee to Nova-HRM...\n");

// First login as HR
loginAsHR((error, token) => {
  if (error) {
    console.log("❌ Cannot proceed without HR login");
    return;
  }

  // Then add the employee
  addEmployee(token);
});
