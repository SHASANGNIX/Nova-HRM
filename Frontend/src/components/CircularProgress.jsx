// frontend/src/components/CircularProgress.jsx
import React from 'react';
import './CircularProgress.css';

function CircularProgress({ value, max = 100, size = 200, showLabel = true, label = '' }) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = 85;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percentage / 100);

  const getColor = (val) => {
    const percent = (val / max) * 100;
    if (percent >= 80) return '#4caf50'; // Excellent
    if (percent >= 60) return '#2196f3'; // Good
    if (percent >= 40) return '#ff9800'; // Average
    return '#f44336'; // Poor
  };

  return (
    <div className="circular-progress-container" style={{ width: size, height: size }}>
      <svg className="circular-progress-svg" viewBox="0 0 200 200">
        {/* Background circle */}
        <circle
          className="circular-progress-bg"
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="#e0e0e0"
          strokeWidth="15"
        />
        {/* Progress circle */}
        <circle
          className="circular-progress-fill"
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke={getColor(value)}
          strokeWidth="15"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 100 100)"
          style={{
            transition: 'stroke-dashoffset 0.8s ease-in-out, stroke 0.3s ease',
          }}
        />
      </svg>
      <div className="circular-progress-content">
        {showLabel && (
          <>
            <div className="circular-progress-value">{value.toFixed(1)}</div>
            {max && <div className="circular-progress-max">/ {max}</div>}
            {label && <div className="circular-progress-label">{label}</div>}
          </>
        )}
      </div>
    </div>
  );
}

export default CircularProgress;

