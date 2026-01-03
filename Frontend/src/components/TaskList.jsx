// frontend/src/components/TaskList.jsx
import React, { useState } from 'react';
import './TaskList.css';

function TaskList({ tasks = [], personalTasks = [], onTaskUpdate, onAddTask, compact = false }) {
  const [activeTab, setActiveTab] = useState('assigned');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '' });

  const handleAddTask = () => {
    if (newTask.title.trim()) {
      onAddTask(newTask.title, newTask.description);
      setNewTask({ title: '', description: '' });
      setShowAddForm(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High':
        return '#f44336';
      case 'Medium':
        return '#ff9800';
      case 'Low':
        return '#4caf50';
      default:
        return '#2196f3';
    }
  };

  // In compact mode, show both assigned and personal tasks combined
  const currentTasks = compact 
    ? [...tasks, ...personalTasks].slice(0, 5)
    : (activeTab === 'assigned' ? tasks : personalTasks);
  const completedCount = currentTasks.filter(t => t.status === 'Completed').length;
  const pendingCount = currentTasks.filter(t => t.status === 'Pending').length;
  const inProgressCount = currentTasks.filter(t => t.status === 'In Progress').length;

  return (
    <div className="task-list">
      <div className="task-header-section">
        <h3>Tasks</h3>
        {!compact && (
          <div className="task-tabs">
            <button
              className={activeTab === 'assigned' ? 'active' : ''}
              onClick={() => setActiveTab('assigned')}
            >
              <span>📌</span>
              <span>Assigned</span>
              <span className="tab-count">{tasks.length}</span>
            </button>
            <button
              className={activeTab === 'personal' ? 'active' : ''}
              onClick={() => setActiveTab('personal')}
            >
              <span>📝</span>
              <span>Personal</span>
              <span className="tab-count">{personalTasks.length}</span>
            </button>
          </div>
        )}
      </div>

      {!compact && (
        <div className="task-stats">
          <div className="stat-item">
            <strong>{currentTasks.length}</strong>
            <span>Total</span>
          </div>
          <div className="stat-item">
            <strong style={{ color: '#2196f3' }}>{inProgressCount}</strong>
            <span>In Progress</span>
          </div>
          <div className="stat-item">
            <strong style={{ color: '#ff9800' }}>{pendingCount}</strong>
            <span>Pending</span>
          </div>
          <div className="stat-item">
            <strong style={{ color: '#4caf50' }}>{completedCount}</strong>
            <span>Completed</span>
          </div>
        </div>
      )}

      {!compact && activeTab === 'personal' && (
        <>
          {!showAddForm && (
            <button className="add-task-btn" onClick={() => setShowAddForm(true)}>
              + Add New Task
            </button>
          )}

          {showAddForm && (
            <div className="add-task-form">
              <input
                type="text"
                placeholder="Task title"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              />
              <textarea
                placeholder="Task description (optional)"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              ></textarea>
              <div className="form-actions">
                <button className="save-btn" onClick={handleAddTask}>
                  Save Task
                </button>
                <button className="cancel-btn" onClick={() => setShowAddForm(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="tasks-section">
        {currentTasks.length > 0 ? (
          currentTasks.map((task) => (
            <div
              key={task.id}
              className={`task-item ${task.status?.toLowerCase().replace(' ', '-')}`}
            >
              <div className="task-checkbox">
                <input
                  type="checkbox"
                  checked={task.status === 'Completed'}
                  onChange={(e) =>
                    onTaskUpdate(
                      task.id,
                      e.target.checked ? 'Completed' : 'Pending',
                      activeTab === 'personal'
                    )
                  }
                />
              </div>
              <div className="task-content">
                <div className="task-header">
                  <h4>{task.title}</h4>
                  {task.priority && (
                    <span
                      className="priority-badge"
                      style={{ backgroundColor: getPriorityColor(task.priority) }}
                    >
                      {task.priority}
                    </span>
                  )}
                </div>
                {task.description && (
                  <div className="task-description">{task.description}</div>
                )}
                <div className="task-meta">
                  {task.status && (
                    <span>Status: <strong>{task.status}</strong></span>
                  )}
                  {task.due_date && (
                    <span>Due: <strong>{new Date(task.due_date).toLocaleDateString()}</strong></span>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="no-tasks">
            <span className="icon">📋</span>
            <p>
              {activeTab === 'assigned'
                ? 'No assigned tasks yet'
                : 'No personal tasks yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default TaskList;
