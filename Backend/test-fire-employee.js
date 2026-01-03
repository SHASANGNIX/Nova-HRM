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
function getAllEmployees(token, callback) {
  console.log("\n🔄 Fetching all employees...\n");

  const options = {
    hostname: "localhost",
    port: 5000,
    path: "/api/auth/employees",
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
          console.log(
            `${index + 1}. ${employee.name} (ID: ${employee.employee_id})`
          );
          console.log(`   📧 Email: ${employee.email}`);
          console.log(`   🏢 Department: ${employee.department}`);
          console.log("");
        });

        callback(null, employees);
      } else {
        console.log("❌ Failed to fetch employees!");
        console.log("Status:", res.statusCode);
        console.log("Error:", responseData);
        callback(new Error("Failed to fetch employees"));
      }
    });
  });

  req.on("error", (error) => {
    console.log("❌ Connection error:", error.message);
    callback(error);
  });

  req.end();
}

// Function to fire an employee
function fireEmployee(token, employeeId, employeeName) {
  console.log(`\n🔥 Firing employee: ${employeeName} (ID: ${employeeId})...\n`);

  const options = {
    hostname: "localhost",
    port: 5000,
    path: `/api/auth/employees/${employeeId}`,
    method: "DELETE",
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
        console.log(`✅ ${employeeName} has been fired successfully!`);
      } else {
        console.log(`❌ Failed to fire ${employeeName}!`);
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
console.log("🧪 Testing Employee Firing Functionality...\n");

// First login as HR
loginAsHR((error, token) => {
  if (error) {
    console.log("❌ Cannot proceed without HR login");
    return;
  }

  // Then get all employees
  getAllEmployees(token, (error, employees) => {
    if (error) {
      console.log("❌ Cannot proceed without employee list");
      return;
    }

    // Find the test employee we added earlier
    const testEmployee = employees.find(
      (emp) => emp.email === "newemployee@dayflow.com"
    );

    if (testEmployee) {
      console.log(`\n🎯 Found test employee: ${testEmployee.name}`);
      console.log("🚨 Firing test employee in 3 seconds...");

      setTimeout(() => {
        fireEmployee(token, testEmployee.employee_id, testEmployee.name);

        // Wait a bit then show remaining employees
        setTimeout(() => {
          console.log("\n📋 Checking remaining employees...");
          getAllEmployees(token, () => {
            console.log("\n✨ Test completed!");
          });
        }, 1000);
      }, 3000);
    } else {
      console.log(
        "\n⚠️  Test employee not found. Please run add-employee.js first."
      );
    }
  });
});
