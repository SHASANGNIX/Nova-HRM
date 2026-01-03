# NOVA-HRM 🚀  
A Full-Stack Human Resource Management System

NOVA-HRM is a full-stack HRM application built to manage employees, attendance, leaves, tasks, performance scores, and salary records.  
The system provides separate dashboards for HR and Employees with role-based access control.

---

## ✨ Features

### HR Features
- Employee management
- Attendance tracking
- Leave approval & management
- Task assignment
- Performance score management
- Salary management

### Employee Features
- Employee dashboard
- View attendance
- Apply for leave
- View assigned tasks
- View performance scorecard

### Authentication
- Secure login system
- Role-based access (HR / Employee)

---

## 🛠 Tech Stack

### Frontend
- React (Vite)
- JSX
- CSS

### Backend
- Node.js
- Express.js
- REST APIs

### Database
- SQL-based database (configured via environment variables)

---

## 📁 Project Structure

```
NOVA-HRM/
│
├── Backend/
│ ├── routes/
│ │ ├── attendance.js
│ │ ├── auth.js
│ │ ├── leave.js
│ │ ├── salary.js
│ │ ├── score.js
│ │ └── task.js
│ │
│ ├── server.js
│ ├── init-db.js
│ ├── add-employee.js
│ ├── list-employees.js
│ ├── test-login.js
│ ├── .env.example
│ └── package.json
│
├── Frontend/
│ ├── public/
│ ├── src/
│ │ ├── components/
│ │ │ ├── CalendarView.jsx
│ │ │ ├── LeaveManagement.jsx
│ │ │ ├── LeaveRequest.jsx
│ │ │ ├── ScoreCard.jsx
│ │ │ └── TaskList.jsx
│ │ │
│ │ ├── pages/
│ │ │ ├── EmployeeDashboard.jsx
│ │ │ ├── HrDashboard.jsx
│ │ │ └── Login.jsx
│ │ │
│ │ ├── App.jsx
│ │ └── main.jsx
│ │
│ └── package.json
│
├── Nova-HRM.mp4
├── LICENSE
└── README.md
```


---

## ⚙️ Installation & Setup

### Clone Repository
```bash
git clone https://github.com/your-username/NOVA-HRM.git
cd NOVA-HRM
```
### Backend Setup
```bash
cd Backend
npm install
```

### Create .env file using .env.example:
```bash
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=nova_hrm
JWT_SECRET=your_secret_key
```

### Initialize database:
```bash
node init-db.js
```

### Start backend server:
```bash
node server.js
```

### Frontend Setup
```bash
cd Frontend
npm install
npm run dev
```

### Frontend runs at:
```bash
http://localhost:5173
```

### Backend runs at:
```bash
http://localhost:5000
```

## 🎥 Demo Video

[▶ Watch Demo Video](Nova-HRM.mp4)
