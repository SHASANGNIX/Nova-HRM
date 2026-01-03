import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import './LeaveRequest.css';

function LeaveRequest() {
  const [activeSubTab, setActiveSubTab] = useState('apply');
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    leaveType: 'Paid',
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchLeaveData();
  }, []);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  const fetchLeaveData = async () => {
    try {
      setLoading(true);
      const [balanceRes, historyRes] = await Promise.all([
        axios.get(`${API_URL}/leaves/balance`, getAuthHeaders()),
        axios.get(`${API_URL}/leaves/history`, getAuthHeaders())
      ]);

      setLeaveBalance(balanceRes.data);
      setLeaveHistory(historyRes.data);
      setMessage('');
    } catch (error) {
      console.error('Error fetching leave data:', error);
      setMessage('Error loading leave data');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    
    if (!formData.startDate || !formData.endDate) {
      setMessage('Please fill in all required fields');
      return;
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      setMessage('Start date must be before end date');
      return;
    }

    try {
      setMessage('Submitting...');
      const response = await axios.post(
        `${API_URL}/leaves/apply`,
        {
          leaveType: formData.leaveType,
          startDate: formData.startDate,
          endDate: formData.endDate,
          reason: formData.reason
        },
        getAuthHeaders()
      );

      setMessage('Leave application submitted successfully!');
      setFormData({
        leaveType: 'Paid',
        startDate: '',
        endDate: '',
        reason: ''
      });

      // Refresh data
      setTimeout(() => {
        fetchLeaveData();
      }, 1500);
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Failed to apply for leave';
      console.error('Leave application error:', error);
      setMessage(errorMsg);
    }
  };

  const handleCancelLeave = async (leaveId) => {
    if (!window.confirm('Are you sure you want to cancel this leave application?')) {
      return;
    }

    try {
      await axios.delete(
        `${API_URL}/leaves/${leaveId}`,
        getAuthHeaders()
      );

      setMessage('Leave cancelled successfully');
      fetchLeaveData();
    } catch (error) {
      setMessage('Failed to cancel leave');
    }
  };

  if (loading) {
    return <div className="loading">Loading leave information...</div>;
  }

  const calculateDays = () => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    }
    return 0;
  };

  const days = calculateDays();
  const availableLeaves = leaveBalance?.[
    formData.leaveType === 'Paid' 
      ? 'paid_leaves' 
      : formData.leaveType === 'Sick' 
      ? 'sick_leaves' 
      : 'unpaid_leaves'
  ] || 0;

  return (
    <div className="leave-request-container">
      <div className="leave-subtabs">
        <button 
          className={activeSubTab === 'apply' ? 'active' : ''}
          onClick={() => setActiveSubTab('apply')}
        >
          Apply for Leave
        </button>
        <button 
          className={activeSubTab === 'balance' ? 'active' : ''}
          onClick={() => setActiveSubTab('balance')}
        >
          Leave Balance
        </button>
        <button 
          className={activeSubTab === 'history' ? 'active' : ''}
          onClick={() => setActiveSubTab('history')}
        >
          History
        </button>
      </div>

      {activeSubTab === 'apply' && (
        <div className="apply-leave-section">
          <div className="form-card">
            <h3>Request Leave</h3>
            
            <div className="leave-policy-note">
              <strong>📋 Leave Policy:</strong> Maximum 2 paid leaves per month. After that, you can apply for unpaid leave.
            </div>

            {message && (
              <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
                {message}
              </div>
            )}

            <form onSubmit={handleApplyLeave}>
              <div className="form-group">
                <label>Leave Type *</label>
                <select
                  value={formData.leaveType}
                  onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                  required
                >
                  <option value="Paid">Paid Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Unpaid">Unpaid Leave</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date *</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>End Date *</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              {days > 0 && (
                <div className="days-info">
                  <p>Total Days: <strong>{days}</strong></p>
                  <p>Available {formData.leaveType} Leaves: <strong>{availableLeaves}</strong></p>
                  {days > availableLeaves && formData.leaveType !== 'Unpaid' && (
                    <p className="warning">⚠️ You don't have enough {formData.leaveType.toLowerCase()} leaves</p>
                  )}
                </div>
              )}

              <div className="form-group">
                <label>Reason</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Please provide a reason for your leave request"
                  rows="4"
                ></textarea>
              </div>

              <button type="submit" className="submit-btn">Submit Application</button>
            </form>
          </div>
        </div>
      )}

      {activeSubTab === 'balance' && (
        <div className="balance-section">
          <h3>Leave Balance</h3>
          {leaveBalance ? (
            <div className="balance-grid">
              <div className="balance-card">
                <div className="balance-type">Paid Leaves</div>
                <div className="balance-value">{leaveBalance.paid_leaves || 0}</div>
                <div className="balance-label">Days Available</div>
              </div>
              <div className="balance-card">
                <div className="balance-type">Sick Leaves</div>
                <div className="balance-value">{leaveBalance.sick_leaves || 0}</div>
                <div className="balance-label">Days Available</div>
              </div>
              <div className="balance-card">
                <div className="balance-type">Unpaid Leaves</div>
                <div className="balance-value">{leaveBalance.unpaid_leaves || 0}</div>
                <div className="balance-label">Days Used</div>
              </div>
            </div>
          ) : (
            <p>No leave balance information available</p>
          )}
        </div>
      )}

      {activeSubTab === 'history' && (
        <div className="history-section">
          <h3>Leave History</h3>
          {leaveHistory.length === 0 ? (
            <p>No leave records found</p>
          ) : (
            <div className="history-list">
              {leaveHistory.map(leave => (
                <div key={leave.id} className={`history-card ${leave.status.toLowerCase()}`}>
                  <div className="history-header">
                    <h4>{leave.leave_type} Leave</h4>
                    <span className={`status-badge ${leave.status.toLowerCase()}`}>
                      {leave.status}
                    </span>
                  </div>

                  <div className="history-dates">
                    <span>
                      {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                    </span>
                  </div>

                  {leave.reason && (
                    <p className="history-reason"><strong>Reason:</strong> {leave.reason}</p>
                  )}

                  <div className="history-meta">
                    <span className="meta-item">
                      Applied: {new Date(leave.created_at).toLocaleDateString()}
                    </span>
                    {leave.approved_at && (
                      <span className="meta-item">
                        {leave.status === 'Approved' ? 'Approved' : 'Processed'}: {new Date(leave.approved_at).toLocaleDateString()}
                      </span>
                    )}
                    {leave.approved_by_name && (
                      <span className="meta-item">
                        By: {leave.approved_by_name}
                      </span>
                    )}
                  </div>

                  {leave.status === 'Pending' && (
                    <button 
                      className="cancel-btn"
                      onClick={() => handleCancelLeave(leave.id)}
                    >
                      Cancel Request
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default LeaveRequest;
