// frontend/src/pages/EmployeeDashboard.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import "./EmployeeDashboard.css";
import AttendanceCard from "../components/AttendanceCard";
import TaskList from "../components/TaskList";
import ScoreCard from "../components/ScoreCard";
import CalendarView from "../components/CalendarView";
import LeaveRequest from "../components/LeaveRequest";
import "./EmployeeDashboard.css";

const API_URL = "http://localhost:5000/api";

function EmployeeDashboard({ onLogout }) {
  const [user, setUser] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [personalTasks, setPersonalTasks] = useState([]);
  const [score, setScore] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchData();
  }, []);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const userData = JSON.parse(localStorage.getItem("user"));
      setUser(userData);

      // Fetch all data
      const [
        attendanceRes,
        assignedTasksRes,
        personalTasksRes,
        scoreRes,
        leavesRes,
        holidaysRes,
      ] = await Promise.all([
        axios.get(`${API_URL}/attendance/today`, getAuthHeaders()),
        axios.get(`${API_URL}/tasks/assigned`, getAuthHeaders()),
        axios.get(`${API_URL}/tasks/personal`, getAuthHeaders()),
        axios.get(`${API_URL}/scores/today`, getAuthHeaders()),
        axios.get(`${API_URL}/leaves/history`, getAuthHeaders()),
        axios.get(`${API_URL}/leaves/holidays`, getAuthHeaders()),
      ]);

      setAttendance(attendanceRes.data);
      setAssignedTasks(assignedTasksRes.data.tasks || []);
      setPersonalTasks(personalTasksRes.data);
      setScore(scoreRes.data);
      setLeaves(leavesRes.data);
      setHolidays(holidaysRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskUpdate = async (taskId, status, isPersonal = false) => {
    try {
      const endpoint = isPersonal
        ? `${API_URL}/tasks/personal/${taskId}`
        : `${API_URL}/tasks/assigned/${taskId}`;

      await axios.put(endpoint, { status }, getAuthHeaders());

      // Refresh data
      if (isPersonal) {
        const res = await axios.get(
          `${API_URL}/tasks/personal`,
          getAuthHeaders()
        );
        setPersonalTasks(res.data);
      } else {
        const res = await axios.get(
          `${API_URL}/tasks/assigned`,
          getAuthHeaders()
        );
        setAssignedTasks(res.data.tasks || []);
      }
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const handleAddPersonalTask = async (title, description) => {
    try {
      await axios.post(
        `${API_URL}/tasks/personal`,
        { title, description },
        getAuthHeaders()
      );
      const res = await axios.get(
        `${API_URL}/tasks/personal`,
        getAuthHeaders()
      );
      setPersonalTasks(res.data);
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="employee-dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Welcome, {user?.name}!</h1>
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
          className={activeTab === "overview" ? "active" : ""}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button
          className={activeTab === "tasks" ? "active" : ""}
          onClick={() => setActiveTab("tasks")}
        >
          Tasks
        </button>
        <button
          className={activeTab === "calendar" ? "active" : ""}
          onClick={() => setActiveTab("calendar")}
        >
          Calendar
        </button>
        <button
          className={activeTab === "leave" ? "active" : ""}
          onClick={() => setActiveTab("leave")}
        >
          Leave Requests
        </button>
      </div>

      {activeTab === "overview" && (
        <div className="dashboard-grid">
          <div className="dashboard-row">
            <AttendanceCard attendance={attendance} />
            <ScoreCard score={score} />
          </div>

          <div className="dashboard-section">
            <h2>Today's Tasks</h2>
            <TaskList
              tasks={assignedTasks.slice(0, 5)}
              personalTasks={personalTasks.slice(0, 5)}
              onTaskUpdate={handleTaskUpdate}
              onAddTask={handleAddPersonalTask}
              compact={true}
            />
          </div>
        </div>
      )}

      {activeTab === "tasks" && (
        <div className="dashboard-section full-width">
          <TaskList
            tasks={assignedTasks}
            personalTasks={personalTasks}
            onTaskUpdate={handleTaskUpdate}
            onAddTask={handleAddPersonalTask}
          />
        </div>
      )}

      {activeTab === "calendar" && (
        <div className="dashboard-section full-width">
          <CalendarView leaves={leaves} holidays={holidays} />
        </div>
      )}

      {activeTab === "leave" && (
        <div className="dashboard-section full-width">
          <LeaveRequest />
        </div>
      )}
    </div>
  );
}

export default EmployeeDashboard;
