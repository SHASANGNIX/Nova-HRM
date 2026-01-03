// frontend/src/components/ScoreCard.jsx
import React from 'react';
import CircularProgress from './CircularProgress';
import './ScoreCard.css';

function ScoreCard({ score }) {
  const getScoreColor = (totalScore) => {
    if (totalScore >= 80) return '#4caf50'; // Excellent
    if (totalScore >= 60) return '#2196f3'; // Good
    if (totalScore >= 40) return '#ff9800'; // Average
    return '#f44336'; // Poor
  };

  const getScoreGrade = (totalScore) => {
    if (totalScore >= 80) return 'Excellent';
    if (totalScore >= 60) return 'Good';
    if (totalScore >= 40) return 'Average';
    return 'Poor';
  };

  return (
    <div className="score-card">
      <div className="card-header">
        <h3>Performance Score</h3>
        <div className="date">{new Date().toLocaleDateString()}</div>
      </div>

      <div className="card-body">
        {score && score.totalScore !== undefined ? (
          <>
            <div className="score-circle-container">
              <CircularProgress
                value={score.totalScore}
                max={100}
                size={200}
                label={getScoreGrade(score.totalScore)}
              />
            </div>

            <div className="score-breakdown">
              <div className="score-item">
                <div className="score-label">
                  <span className="icon">📍</span>
                  Attendance Score
                </div>
                <div className="score-bar">
                  <div
                    className="score-fill attendance"
                    style={{ width: `${(score.attendanceScore / 40) * 100}%` }}
                  ></div>
                </div>
                <div className="score-points">{score.attendanceScore} / 40</div>
              </div>

              <div className="score-item">
                <div className="score-label">
                  <span className="icon">✓</span>
                  Task Completion
                </div>
                <div className="score-bar">
                  <div
                    className="score-fill task"
                    style={{ width: `${(score.taskScore / 40) * 100}%` }}
                  ></div>
                </div>
                <div className="score-points">{score.taskScore} / 40</div>
              </div>

              <div className="score-item">
                <div className="score-label">
                  <span className="icon">⏰</span>
                  Punctuality
                </div>
                <div className="score-bar">
                  <div
                    className="score-fill punctuality"
                    style={{ width: `${(score.punctualityScore / 20) * 100}%` }}
                  ></div>
                </div>
                <div className="score-points">{score.punctualityScore} / 20</div>
              </div>
            </div>

            {score.totalScore < 40 && (
              <div className="warning-badge">
                ⚠️ Your performance score is below average
              </div>
            )}
          </>
        ) : (
          <div className="no-score">
            <span className="icon">📊</span>
            <p>No score data available yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ScoreCard;
