// frontend/src/components/CalendarView.jsx
import React, { useState } from 'react';
import './CalendarView.css';

function CalendarView({ leaves, holidays }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const isLeaveDay = (day) => {
    if (!leaves || leaves.length === 0) return false;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return leaves.some(leave => {
      if (leave.status !== 'Approved') return false;
      const startDate = new Date(leave.start_date);
      const endDate = new Date(leave.end_date);
      const checkDate = new Date(dateStr);
      return checkDate >= startDate && checkDate <= endDate;
    });
  };

  const isHoliday = (day) => {
    if (!holidays || holidays.length === 0) return false;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidays.find(holiday => {
      const holidayDate = new Date(holiday.date).toISOString().split('T')[0];
      return holidayDate === dateStr;
    });
  };

  const isToday = (day) => {
    const today = new Date();
    return today.getDate() === day && 
           today.getMonth() === month && 
           today.getFullYear() === year;
  };

  const getDateInfo = (day) => {
    const holiday = isHoliday(day);
    const leave = isLeaveDay(day);
    
    return {
      isHoliday: !!holiday,
      holidayName: holiday?.name,
      isLeave: leave
    };
  };

  const renderCalendarDays = () => {
    const days = [];
    
    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateInfo = getDateInfo(day);
      const classes = ['calendar-day'];
      
      if (isToday(day)) classes.push('today');
      if (dateInfo.isHoliday) classes.push('holiday');
      if (dateInfo.isLeave) classes.push('leave');

      days.push(
        <div 
          key={day} 
          className={classes.join(' ')}
          onClick={() => setSelectedDate({ day, ...dateInfo })}
        >
          <span className="day-number">{day}</span>
          {dateInfo.isHoliday && <span className="indicator holiday-indicator">🎉</span>}
          {dateInfo.isLeave && <span className="indicator leave-indicator">🏖️</span>}
        </div>
      );
    }

    return days;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <button onClick={previousMonth} className="nav-btn">‹</button>
        <h3>{monthNames[month]} {year}</h3>
        <button onClick={nextMonth} className="nav-btn">›</button>
      </div>

      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-color holiday"></span>
          <span>Holiday</span>
        </div>
        <div className="legend-item">
          <span className="legend-color leave"></span>
          <span>Leave</span>
        </div>
        <div className="legend-item">
          <span className="legend-color today"></span>
          <span>Today</span>
        </div>
      </div>

      <div className="calendar-grid">
        <div className="calendar-day-header">Sun</div>
        <div className="calendar-day-header">Mon</div>
        <div className="calendar-day-header">Tue</div>
        <div className="calendar-day-header">Wed</div>
        <div className="calendar-day-header">Thu</div>
        <div className="calendar-day-header">Fri</div>
        <div className="calendar-day-header">Sat</div>
        
        {renderCalendarDays()}
      </div>

      {selectedDate && (
        <div className="date-details">
          <h4>{monthNames[month]} {selectedDate.day}, {year}</h4>
          {selectedDate.isHoliday && (
            <p className="detail-item holiday">🎉 {selectedDate.holidayName}</p>
          )}
          {selectedDate.isLeave && (
            <p className="detail-item leave">🏖️ You have a leave on this day</p>
          )}
          {!selectedDate.isHoliday && !selectedDate.isLeave && (
            <p className="detail-item">Regular working day</p>
          )}
        </div>
      )}

      <div className="upcoming-section">
        <h4>Upcoming Holidays</h4>
        <div className="upcoming-list">
          {holidays && holidays.length > 0 ? (
            holidays.slice(0, 5).map(holiday => (
              <div key={holiday.id} className="upcoming-item">
                <span className="icon">🎉</span>
                <div>
                  <strong>{holiday.name}</strong>
                  <small>{new Date(holiday.date).toLocaleDateString()}</small>
                </div>
              </div>
            ))
          ) : (
            <p>No upcoming holidays</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default CalendarView;