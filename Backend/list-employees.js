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

// Function to get all employees
function getAllEmployees(token) {
  console.log("\n🔄 Fetching all employees...\n");

  const options = {
    hostname: "localhost",
    port: 5000,
    path: "/api/auth/employees", // Assuming there's an endpoint to get all employees
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const req = http.request(options, (res) => {
    let responseData = "";

    res.on("data", (chunk) => {
      responseData += chunk;
    });

    res.on("end", () => {
      if (res.statusCode === 200) {
        const employees = JSON.parse(responseData);
        console.log("✅ Employees fetched successfully!");
        console.log(`\n👥 Total Employees: ${employees.length}\n`);

        employees.forEach((employee, index) => {
          console.log(`${index + 1}. ${employee.name}`);
          console.log(`   📧 Email: ${employee.email}`);
          console.log(`   🏢 Department: ${employee.department}`);
          console.log(`   💼 Designation: ${employee.designation}`);
          console.log(`   📅 Join Date: ${employee.join_date}`);
          console.log("");
        });
      } else {
        console.log("❌ Failed to fetch employees!");
        console.log("Status:", res.statusCode);
        console.log("Error:", responseData);
      }
    });
  });

  req.on("error", (error) => {
    console.log("❌ Connection error:", error.message);
  });

  req.end();
}

// Main execution
console.log("📋 Listing all employees in Nova-HRM...\n");

// First login as HR
loginAsHR((error, token) => {
  if (error) {
    console.log("❌ Cannot proceed without HR login");
    return;
  }

  // Then get all employees
  getAllEmployees(token);
});
