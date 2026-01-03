// frontend/src/pages/HrDashboard.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import "./HrDashboard.css";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import "./HrDashboard.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const API_URL = "http://localhost:5000/api";

function HrDashboard({ onLogout }) {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [bestEmployee, setBestEmployee] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("employees");
  const [showAddEmployeeForm, setShowAddEmployeeForm] = useState(false);
  const [showAssignTaskForm, setShowAssignTaskForm] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    email: "",
    password: "",
    name: "",
    department: "",
    designation: "",
    basicSalary: "",
  });
  const [newTask, setNewTask] = useState({
    employeeId: "",
    title: "",
    description: "",
    priority: "Medium",
    dueDate: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

  const fetchData = async () => {
    try {
      setLoading(true);

      const [employeesRes, bestEmpRes, leavesRes, tasksRes] = await Promise.all(
        [
          axios.get(`${API_URL}/auth/employees`, getAuthHeaders()),
          axios.get(`${API_URL}/scores/best-employee`, getAuthHeaders()),
          axios.get(`${API_URL}/leaves/all?status=Pending`, getAuthHeaders()),
          axios.get(`${API_URL}/tasks/all`, getAuthHeaders()),
        ]
      );

      setEmployees(employeesRes.data);
      setBestEmployee(bestEmpRes.data);
      setLeaveRequests(leavesRes.data);
      setTasks(tasksRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeDetails = async (employeeId) => {
    try {
      const [attendance, tasks, leaves, scores] = await Promise.all([
        axios.get(
          `${API_URL}/attendance/employee/${employeeId}`,
          getAuthHeaders()
        ),
        axios.get(`${API_URL}/tasks/stats/${employeeId}`, getAuthHeaders()),
        axios.get(`${API_URL}/leaves/stats/${employeeId}`, getAuthHeaders()),
        axios.get(
          `${API_URL}/scores/analytics/${employeeId}`,
          getAuthHeaders()
        ),
      ]);

      setEmployeeDetails({
        attendance: attendance.data,
        tasks: tasks.data,
        leaves: leaves.data,
        scores: scores.data,
      });
    } catch (error) {
      console.error("Error fetching employee details:", error);
    }
  };

  const handleEmployeeClick = (employee) => {
    setSelectedEmployee(employee);
    fetchEmployeeDetails(employee.id);
  };

  const handleLeaveApproval = async (leaveId, status) => {
    try {
      await axios.put(
        `${API_URL}/leaves/${leaveId}/status`,
        { status },
        getAuthHeaders()
      );

      // Refresh leave requests
      const res = await axios.get(
        `${API_URL}/leaves/all?status=Pending`,
        getAuthHeaders()
      );
      setLeaveRequests(res.data);
    } catch (error) {
      console.error("Error updating leave:", error);
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    try {
      const employeeData = {
        ...newEmployee,
        role: "Employee",
        joinDate: new Date().toISOString().split("T")[0],
      };

      await axios.post(
        `${API_URL}/auth/register`,
        employeeData,
        getAuthHeaders()
      );

      // Reset form
      setNewEmployee({
        email: "",
        password: "",
        name: "",
        department: "",
        designation: "",
        basicSalary: "",
      });
      setShowAddEmployeeForm(false);

      // Refresh employees list
      fetchData();

      alert("Employee added successfully!");
    } catch (error) {
      console.error("Error adding employee:", error);
      alert("Failed to add employee. Please try again.");
    }
  };

  const handleFireEmployee = async (employeeId, employeeName, e) => {
    e.stopPropagation(); // Prevent triggering the card click

    if (!employeeId) {
      alert("Cannot fire this employee due to invalid data.");
      return;
    }

    if (
      window.confirm(
        `Are you sure you want to fire ${employeeName}? This action cannot be undone.`
      )
    ) {
      try {
        await axios.delete(
          `${API_URL}/auth/employees/${employeeId}`,
          getAuthHeaders()
        );

        // Refresh employees list
        fetchData();

        // Clear selected employee if it was the fired one
        if (selectedEmployee && selectedEmployee.employee_id === employeeId) {
          setSelectedEmployee(null);
          setEmployeeDetails(null);
        }

        alert(`${employeeName} has been fired successfully.`);
      } catch (error) {
        console.error("Error firing employee:", error);
        alert("Failed to fire employee. Please try again.");
      }
    }
  };

  const handleAssignTask = async (e) => {
    e.preventDefault();

    if (!newTask.employeeId || !newTask.title || !newTask.description) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      await axios.post(
        `${API_URL}/tasks/assign`,
        {
          employeeId: newTask.employeeId,
          title: newTask.title,
          description: newTask.description,
          priority: newTask.priority,
          dueDate: newTask.dueDate || null,
        },
        getAuthHeaders()
      );

      // Reset form
      setNewTask({
        employeeId: "",
        title: "",
        description: "",
        priority: "Medium",
        dueDate: "",
      });
      setShowAssignTaskForm(false);

      // Refresh tasks list
      fetchData();

      alert("Task assigned successfully!");
    } catch (error) {
      console.error("Error assigning task:", error);
      alert("Failed to assign task. Please try again.");
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="hr-dashboard">
      <header className="dashboard-header">
        <div>
          <h1>HR Dashboard</h1>
          <p>
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <button onClick={onLogout} className="logout-btn">
          Logout
        </button>
      </header>

      <div className="dashboard-tabs">
        <button
          className={activeTab === "employees" ? "active" : ""}
          onClick={() => setActiveTab("employees")}
        >
          Employees
        </button>
        <button
          className={activeTab === "tasks" ? "active" : ""}
          onClick={() => setActiveTab("tasks")}
        >
          Tasks ({tasks.length})
        </button>
        <button
          className={activeTab === "leaves" ? "active" : ""}
          onClick={() => setActiveTab("leaves")}
        >
          Leave Requests ({leaveRequests.length})
        </button>
        <button
          className={activeTab === "analytics" ? "active" : ""}
          onClick={() => setActiveTab("analytics")}
        >
          Analytics
        </button>
      </div>

      {activeTab === "employees" && (
        <div className="hr-content">
          <div className="best-employee-card">
            <h3>🏆 Best Employee of the Month</h3>
            {bestEmployee && bestEmployee.name ? (
              <div>
                <h2>{bestEmployee.name}</h2>
                <p>
                  {bestEmployee.department} - {bestEmployee.designation}
                </p>
                <div className="score-badge">
                  Score: {bestEmployee.average_score}
                </div>
              </div>
            ) : (
              <p>No data available</p>
            )}
          </div>

          {/* Employee Management Section */}
          <div className="employee-management">
            <div className="management-header">
              <h3>👥 Employee Management</h3>
              <button
                className="add-employee-btn"
                onClick={() => setShowAddEmployeeForm(!showAddEmployeeForm)}
              >
                {showAddEmployeeForm ? "Cancel" : "+ Add Employee"}
              </button>
            </div>

            {showAddEmployeeForm && (
              <div className="add-employee-form">
                <h4>Add New Employee</h4>
                <form onSubmit={handleAddEmployee}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Name:</label>
                      <input
                        type="text"
                        value={newEmployee.name}
                        onChange={(e) =>
                          setNewEmployee({
                            ...newEmployee,
                            name: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Email:</label>
                      <input
                        type="email"
                        value={newEmployee.email}
                        onChange={(e) =>
                          setNewEmployee({
                            ...newEmployee,
                            email: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Department:</label>
                      <input
                        type="text"
                        value={newEmployee.department}
                        onChange={(e) =>
                          setNewEmployee({
                            ...newEmployee,
                            department: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Designation:</label>
                      <input
                        type="text"
                        value={newEmployee.designation}
                        onChange={(e) =>
                          setNewEmployee({
                            ...newEmployee,
                            designation: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Password:</label>
                      <input
                        type="password"
                        value={newEmployee.password}
                        onChange={(e) =>
                          setNewEmployee({
                            ...newEmployee,
                            password: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Basic Salary:</label>
                      <input
                        type="number"
                        value={newEmployee.basicSalary}
                        onChange={(e) =>
                          setNewEmployee({
                            ...newEmployee,
                            basicSalary: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="submit-btn">
                      Add Employee
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddEmployeeForm(false)}
                      className="cancel-btn"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="employees-list">
              <h4>All Employees ({employees.length})</h4>
              {employees.length === 0 ? (
                <p>No employees found</p>
              ) : (
                <div className="employees-grid">
                  {employees.map((employee) => (
                    <div
                      key={employee.id}
                      className={`employee-card ${
                        selectedEmployee && selectedEmployee.id === employee.id
                          ? "selected"
                          : ""
                      }`}
                      onClick={() => handleEmployeeClick(employee)}
                    >
                      <div className="employee-card-header">
                        <h3>{employee.name}</h3>
                        <button
                          className="fire-btn"
                          onClick={(e) =>
                            employee.employee_id
                              ? handleFireEmployee(
                                  employee.employee_id,
                                  employee.name,
                                  e
                                )
                              : null
                          }
                          disabled={!employee.employee_id}
                          title={
                            employee.employee_id
                              ? `Fire ${employee.name}`
                              : "Cannot fire this employee (invalid data)"
                          }
                        >
                          🔥 Fire
                        </button>
                      </div>
                      <p>
                        <strong>Email:</strong> {employee.email}
                      </p>
                      <p>
                        <strong>Department:</strong> {employee.department}
                      </p>
                      <p>
                        <strong>Designation:</strong> {employee.designation}
                      </p>
                      <p>
                        <strong>Join Date:</strong>{" "}
                        {new Date(employee.join_date).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedEmployee && employeeDetails && (
            <div className="employee-analytics">
              <h3>Analytics for {selectedEmployee.name}</h3>

              <div className="analytics-grid">
                <div className="chart-card">
                  <h4>Attendance Overview</h4>
                  <div className="stats">
                    <div className="stat">
                      <span>Present:</span>
                      <strong>
                        {employeeDetails.attendance.stats?.present || 0}
                      </strong>
                    </div>
                    <div className="stat">
                      <span>Absent:</span>
                      <strong>
                        {employeeDetails.attendance.stats?.absent || 0}
                      </strong>
                    </div>
                    <div className="stat">
                      <span>Late:</span>
                      <strong>
                        {employeeDetails.attendance.stats?.late || 0}
                      </strong>
                    </div>
                    <div className="stat">
                      <span>Percentage:</span>
                      <strong>
                        {employeeDetails.attendance.stats?.percentage || 0}%
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="chart-card">
                  <h4>Task Statistics</h4>
                  <div className="stats">
                    <div className="stat">
                      <span>Total:</span>
                      <strong>{employeeDetails.tasks.total || 0}</strong>
                    </div>
                    <div className="stat">
                      <span>Completed:</span>
                      <strong>{employeeDetails.tasks.completed || 0}</strong>
                    </div>
                    <div className="stat">
                      <span>Completion Rate:</span>
                      <strong>{employeeDetails.tasks.percentage || 0}%</strong>
                    </div>
                  </div>
                </div>

                <div className="chart-card">
                  <h4>Leave Statistics</h4>
                  <div className="stats">
                    <div className="stat">
                      <span>Paid Leaves Left:</span>
                      <strong>
                        {employeeDetails.leaves.balance?.paid_leaves || 0}
                      </strong>
                    </div>
                    <div className="stat">
                      <span>Sick Leaves Left:</span>
                      <strong>
                        {employeeDetails.leaves.balance?.sick_leaves || 0}
                      </strong>
                    </div>
                    <div className="stat">
                      <span>Total Leaves Taken:</span>
                      <strong>
                        {employeeDetails.leaves.stats?.approved || 0}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="chart-card">
                  <h4>Performance Score</h4>
                  <div className="stats">
                    <div className="stat">
                      <span>Average:</span>
                      <strong>
                        {employeeDetails.scores.stats?.average || 0}
                      </strong>
                    </div>
                    <div className="stat">
                      <span>Highest:</span>
                      <strong>
                        {employeeDetails.scores.stats?.highest || 0}
                      </strong>
                    </div>
                    <div className="stat">
                      <span>Lowest:</span>
                      <strong>
                        {employeeDetails.scores.stats?.lowest || 0}
                      </strong>
                    </div>
                  </div>

                  {employeeDetails.scores.warnings?.length > 0 && (
                    <div className="warnings">
                      <h5>⚠️ Recent Warnings</h5>
                      {employeeDetails.scores.warnings
                        .slice(0, 3)
                        .map((warning) => (
                          <div key={warning.id} className="warning-item">
                            <span>{warning.message}</span>
                            <small>
                              {new Date(
                                warning.created_at
                              ).toLocaleDateString()}
                            </small>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "tasks" && (
        <div className="hr-content">
          <div className="task-management">
            <div className="management-header">
              <h3>📋 Task Management</h3>
              <button
                className="assign-task-btn"
                onClick={() => setShowAssignTaskForm(!showAssignTaskForm)}
              >
                {showAssignTaskForm ? "Cancel" : "+ Assign Task"}
              </button>
            </div>

            {showAssignTaskForm && (
              <div className="assign-task-form">
                <h4>Assign New Task</h4>
                <form onSubmit={handleAssignTask}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Employee:</label>
                      <select
                        value={newTask.employeeId}
                        onChange={(e) =>
                          setNewTask({
                            ...newTask,
                            employeeId: e.target.value,
                          })
                        }
                        required
                      >
                        <option value="">Select Employee</option>
                        {employees
                          .filter((emp) => emp.employee_id)
                          .map((employee) => (
                            <option
                              key={employee.employee_id}
                              value={employee.employee_id}
                            >
                              {employee.name} - {employee.department}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Priority:</label>
                      <select
                        value={newTask.priority}
                        onChange={(e) =>
                          setNewTask({
                            ...newTask,
                            priority: e.target.value,
                          })
                        }
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Title:</label>
                      <input
                        type="text"
                        value={newTask.title}
                        onChange={(e) =>
                          setNewTask({
                            ...newTask,
                            title: e.target.value,
                          })
                        }
                        required
                        placeholder="Task title"
                      />
                    </div>
                    <div className="form-group">
                      <label>Due Date:</label>
                      <input
                        type="date"
                        value={newTask.dueDate}
                        onChange={(e) =>
                          setNewTask({
                            ...newTask,
                            dueDate: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Description:</label>
                    <textarea
                      value={newTask.description}
                      onChange={(e) =>
                        setNewTask({
                          ...newTask,
                          description: e.target.value,
                        })
                      }
                      required
                      placeholder="Task description"
                      rows="3"
                    />
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="submit-btn">
                      Assign Task
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAssignTaskForm(false)}
                      className="cancel-btn"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="tasks-list">
              <h4>All Tasks ({tasks.length})</h4>
              {tasks.length === 0 ? (
                <p>No tasks assigned yet</p>
              ) : (
                <div className="tasks-grid">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className={`task-card ${task.status
                        .toLowerCase()
                        .replace(" ", "-")}`}
                    >
                      <div className="task-card-header">
                        <h4>{task.title}</h4>
                        <span
                          className={`priority-badge ${task.priority.toLowerCase()}`}
                        >
                          {task.priority}
                        </span>
                      </div>
                      <div className="task-card-body">
                        <p className="task-description">{task.description}</p>
                        <div className="task-meta">
                          <p>
                            <strong>Assigned to:</strong> {task.employee_name}
                          </p>
                          <p>
                            <strong>Department:</strong> {task.department}
                          </p>
                          <p>
                            <strong>Status:</strong>
                            <span
                              className={`status-badge ${task.status
                                .toLowerCase()
                                .replace(" ", "-")}`}
                            >
                              {task.status}
                            </span>
                          </p>
                          {task.due_date && (
                            <p>
                              <strong>Due:</strong>{" "}
                              {new Date(task.due_date).toLocaleDateString()}
                            </p>
                          )}
                          <p>
                            <strong>Assigned by:</strong>{" "}
                            {task.assigned_by_name || "HR"}
                          </p>
                          <p>
                            <strong>Created:</strong>{" "}
                            {new Date(task.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "leaves" && (
        <div className="leave-requests">
          <h3>Pending Leave Requests</h3>
          {leaveRequests.length === 0 ? (
            <p>No pending leave requests</p>
          ) : (
            <div className="requests-list">
              {leaveRequests.map((leave) => (
                <div key={leave.id} className="leave-card">
                  <div className="leave-info">
                    <h4>{leave.employee_name}</h4>
                    <p>{leave.department}</p>
                    <div className="leave-details">
                      <span className="leave-type">{leave.leave_type}</span>
                      <span>
                        {new Date(leave.start_date).toLocaleDateString()} -{" "}
                        {new Date(leave.end_date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="leave-reason">{leave.reason}</p>
                  </div>
                  <div className="leave-actions">
                    <button
                      className="approve-btn"
                      onClick={() => handleLeaveApproval(leave.id, "Approved")}
                    >
                      Approve
                    </button>
                    <button
                      className="reject-btn"
                      onClick={() => handleLeaveApproval(leave.id, "Rejected")}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "analytics" && (
        <div className="analytics-overview">
          <h3>Company-wide Analytics</h3>
          <p>Analytics dashboard coming soon...</p>
        </div>
      )}
    </div>
  );
}

export default HrDashboard;
