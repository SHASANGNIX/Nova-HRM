import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import './LeaveManagement.css';

function LeaveManagement() {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [filterStatus, setFilterStatus] = useState('Pending');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchLeaveRequests();
  }, [filterStatus]);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${API_URL}/leaves/all?status=${filterStatus}`,
        getAuthHeaders()
      );
      setLeaveRequests(res.data);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveApproval = async (leaveId, status) => {
    try {
      setMessage('Processing...');
      await axios.put(
        `${API_URL}/leaves/${leaveId}/status`,
        { status },
        getAuthHeaders()
      );

      setMessage(`Leave ${status.toLowerCase()} successfully!`);
      setTimeout(() => {
        fetchLeaveRequests();
        setMessage('');
      }, 1500);
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to process leave request';
      console.error('Leave approval error:', error);
      setMessage(errorMsg);
    }
  };

  const calculateDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  };

  if (loading) {
    return <div className="loading">Loading leave requests...</div>;
  }

  return (
    <div className="leave-management-container">
      <div className="leave-header">
        <h3>Leave Request Management</h3>
        <div className="filter-buttons">
          <button 
            className={filterStatus === 'Pending' ? 'active' : ''}
            onClick={() => setFilterStatus('Pending')}
          >
            Pending ({leaveRequests.filter(l => l.status === 'Pending').length})
          </button>
          <button 
            className={filterStatus === 'Approved' ? 'active' : ''}
            onClick={() => setFilterStatus('Approved')}
          >
            Approved
          </button>
          <button 
            className={filterStatus === 'Rejected' ? 'active' : ''}
            onClick={() => setFilterStatus('Rejected')}
          >
            Rejected
          </button>
        </div>
      </div>

      {message && (
        <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {leaveRequests.length === 0 ? (
        <div className="no-requests">
          <p>No {filterStatus.toLowerCase()} leave requests</p>
        </div>
      ) : (
        <div className="leaves-grid">
          {leaveRequests.map(leave => (
            <div key={leave.id} className={`leave-card ${leave.status.toLowerCase()}`}>
              <div className="leave-card-header">
                <div className="employee-info">
                  <h4>{leave.employee_name}</h4>
                  <p className="department">{leave.department}</p>
                </div>
                <span className={`status-badge ${leave.status.toLowerCase()}`}>
                  {leave.status}
                </span>
              </div>

              <div className="leave-card-body">
                <div className="leave-type-row">
                  <span className={`leave-type-badge ${leave.leave_type.toLowerCase().replace(' ', '-')}`}>
                    {leave.leave_type}
                  </span>
                  <span className="days-count">
                    {calculateDays(leave.start_date, leave.end_date)} Days
                  </span>
                </div>

                <div className="date-range">
                  <span className="date">
                    <strong>From:</strong> {new Date(leave.start_date).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                  <span className="date">
                    <strong>To:</strong> {new Date(leave.end_date).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>

                {leave.reason && (
                  <div className="reason-section">
                    <strong>Reason:</strong>
                    <p>{leave.reason}</p>
                  </div>
                )}

                <div className="leave-meta">
                  <span className="meta-item">
                    <strong>Applied:</strong> {new Date(leave.created_at).toLocaleDateString()}
                  </span>
                  {leave.approved_by_name && (
                    <span className="meta-item">
                      <strong>By:</strong> {leave.approved_by_name}
                    </span>
                  )}
                </div>
              </div>

              {leave.status === 'Pending' && (
                <div className="leave-card-actions">
                  <button 
                    className="approve-btn"
                    onClick={() => handleLeaveApproval(leave.id, 'Approved')}
                  >
                    ✓ Approve
                  </button>
                  <button 
                    className="reject-btn"
                    onClick={() => handleLeaveApproval(leave.id, 'Rejected')}
                  >
                    ✕ Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default LeaveManagement;
