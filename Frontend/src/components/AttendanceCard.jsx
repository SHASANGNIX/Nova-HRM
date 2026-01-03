// frontend/src/components/AttendanceCard.jsx
import React from 'react';
import './AttendanceCard.css';

function AttendanceCard({ attendance }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'Present':
        return '#4CAF50';
      case 'Late':
        return '#FF9800';
      case 'Absent':
        return '#F44336';
      case 'Leave':
        return '#2196F3';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Present':
        return '✓';
      case 'Late':
        return '⏰';
      case 'Absent':
        return '✗';
      case 'Leave':
        return '🏖️';
      default:
        return '?';
    }
  };

  return (
    <div className="attendance-card">
      <div className="card-header">
        <h3>Today's Attendance</h3>
      </div>
      
      <div className="card-body">
        {attendance && attendance.status !== 'Not Marked' ? (
          <>
            <div 
              className="status-badge"
              style={{ backgroundColor: getStatusColor(attendance.status) }}
            >
              <span className="status-icon">{getStatusIcon(attendance.status)}</span>
              <span className="status-text">{attendance.status}</span>
            </div>

            {attendance.login_time && (
              <div className="time-info">
                <div className="time-item">
                  <span className="label">Login Time:</span>
                  <span className="value">{attendance.login_time}</span>
                </div>
                
                {attendance.logout_time && (
                  <div className="time-item">
                    <span className="label">Logout Time:</span>
                    <span className="value">{attendance.logout_time}</span>
                  </div>
                )}
              </div>
            )}

            {attendance.is_late && (
              <div className="late-warning">
                ⚠️ Late Login Detected
              </div>
            )}
          </>
        ) : (
          <div className="not-marked">
            <span className="icon">📝</span>
            <p>Attendance will be marked automatically on login</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AttendanceCard;