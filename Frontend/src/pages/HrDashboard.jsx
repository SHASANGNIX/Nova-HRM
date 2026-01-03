// frontend/src/pages/HrDashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import './HrDashboard.css';

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

const API_URL = 'http://localhost:5000/api';

function HrDashboard({ onLogout }) {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [bestEmployee, setBestEmployee] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('employees');

  useEffect(() => {
    fetchData();
  }, []);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch employees and other data
      const employeesRes = await axios.get(`${API_URL}/auth/me`, getAuthHeaders());
      // In a real app, you'd have an endpoint to get all employees
      // For now, we'll fetch best employee and leave requests
      
      const [bestEmpRes, leavesRes] = await Promise.all([
        axios.get(`${API_URL}/scores/best-employee`, getAuthHeaders()),
        axios.get(`${API_URL}/leaves/all?status=Pending`, getAuthHeaders())
      ]);

      setBestEmployee(bestEmpRes.data);
      setLeaveRequests(leavesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeDetails = async (employeeId) => {
    try {
      const [attendance, tasks, leaves, scores] = await Promise.all([
        axios.get(`${API_URL}/attendance/employee/${employeeId}`, getAuthHeaders()),
        axios.get(`${API_URL}/tasks/stats/${employeeId}`, getAuthHeaders()),
        axios.get(`${API_URL}/leaves/stats/${employeeId}`, getAuthHeaders()),
        axios.get(`${API_URL}/scores/analytics/${employeeId}`, getAuthHeaders())
      ]);

      setEmployeeDetails({
        attendance: attendance.data,
        tasks: tasks.data,
        leaves: leaves.data,
        scores: scores.data
      });
    } catch (error) {
      console.error('Error fetching employee details:', error);
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
      const res = await axios.get(`${API_URL}/leaves/all?status=Pending`, getAuthHeaders());
      setLeaveRequests(res.data);
    } catch (error) {
      console.error('Error updating leave:', error);
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
          <p>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </header>

      <div className="dashboard-tabs">
        <button 
          className={activeTab === 'employees' ? 'active' : ''}
          onClick={() => setActiveTab('employees')}
        >
          Employees
        </button>
        <button 
          className={activeTab === 'leaves' ? 'active' : ''}
          onClick={() => setActiveTab('leaves')}
        >
          Leave Requests ({leaveRequests.length})
        </button>
        <button 
          className={activeTab === 'analytics' ? 'active' : ''}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </button>
      </div>

      {activeTab === 'employees' && (
        <div className="hr-content">
          <div className="best-employee-card">
            <h3>🏆 Best Employee of the Month</h3>
            {bestEmployee && bestEmployee.name ? (
              <div>
                <h2>{bestEmployee.name}</h2>
                <p>{bestEmployee.department} - {bestEmployee.designation}</p>
                <div className="score-badge">
                  Score: {bestEmployee.average_score}
                </div>
              </div>
            ) : (
              <p>No data available</p>
            )}
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
                      <strong>{employeeDetails.attendance.stats?.present || 0}</strong>
                    </div>
                    <div className="stat">
                      <span>Absent:</span>
                      <strong>{employeeDetails.attendance.stats?.absent || 0}</strong>
                    </div>
                    <div className="stat">
                      <span>Late:</span>
                      <strong>{employeeDetails.attendance.stats?.late || 0}</strong>
                    </div>
                    <div className="stat">
                      <span>Percentage:</span>
                      <strong>{employeeDetails.attendance.stats?.percentage || 0}%</strong>
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
                      <strong>{employeeDetails.leaves.balance?.paid_leaves || 0}</strong>
                    </div>
                    <div className="stat">
                      <span>Sick Leaves Left:</span>
                      <strong>{employeeDetails.leaves.balance?.sick_leaves || 0}</strong>
                    </div>
                    <div className="stat">
                      <span>Total Leaves Taken:</span>
                      <strong>{employeeDetails.leaves.stats?.approved || 0}</strong>
                    </div>
                  </div>
                </div>

                <div className="chart-card">
                  <h4>Performance Score</h4>
                  <div className="stats">
                    <div className="stat">
                      <span>Average:</span>
                      <strong>{employeeDetails.scores.stats?.average || 0}</strong>
                    </div>
                    <div className="stat">
                      <span>Highest:</span>
                      <strong>{employeeDetails.scores.stats?.highest || 0}</strong>
                    </div>
                    <div className="stat">
                      <span>Lowest:</span>
                      <strong>{employeeDetails.scores.stats?.lowest || 0}</strong>
                    </div>
                  </div>
                  
                  {employeeDetails.scores.warnings?.length > 0 && (
                    <div className="warnings">
                      <h5>⚠️ Recent Warnings</h5>
                      {employeeDetails.scores.warnings.slice(0, 3).map(warning => (
                        <div key={warning.id} className="warning-item">
                          <span>{warning.message}</span>
                          <small>{new Date(warning.created_at).toLocaleDateString()}</small>
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

      {activeTab === 'leaves' && (
        <div className="leave-requests">
          <h3>Pending Leave Requests</h3>
          {leaveRequests.length === 0 ? (
            <p>No pending leave requests</p>
          ) : (
            <div className="requests-list">
              {leaveRequests.map(leave => (
                <div key={leave.id} className="leave-card">
                  <div className="leave-info">
                    <h4>{leave.employee_name}</h4>
                    <p>{leave.department}</p>
                    <div className="leave-details">
                      <span className="leave-type">{leave.leave_type}</span>
                      <span>{new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}</span>
                    </div>
                    <p className="leave-reason">{leave.reason}</p>
                  </div>
                  <div className="leave-actions">
                    <button 
                      className="approve-btn"
                      onClick={() => handleLeaveApproval(leave.id, 'Approved')}
                    >
                      Approve
                    </button>
                    <button 
                      className="reject-btn"
                      onClick={() => handleLeaveApproval(leave.id, 'Rejected')}
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

      {activeTab === 'analytics' && (
        <div className="analytics-overview">
          <h3>Company-wide Analytics</h3>
          <p>Analytics dashboard coming soon...</p>
        </div>
      )}
    </div>
  );
}

export default HrDashboard;