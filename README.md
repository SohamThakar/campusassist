# CampusAssist

**CampusAssist** is a full-stack campus maintenance complaint management system designed to streamline the process of reporting, reviewing, approving, assigning, and resolving campus maintenance issues.

The system provides dedicated portals for **Students, Authorities, Service Providers, and Principals**, with role-based access control, complaint tracking, evidence uploads, maintenance job management, dashboards, analytics, and institutional reports.

> **Note:** All complaint prioritization, approval, assignment, and resolution decisions are handled by authorized human users. The system does not use AI for decision-making.

## 🚀 Features

* Student maintenance complaint submission
* Photo and video evidence uploads
* Automatic complaint ticket generation
* Student complaint tracking
* Complaint status timeline and history
* Authority approval and rejection workflow
* Request-for-information workflow
* Service provider assignment and job management
* Accept / Decline maintenance jobs
* Active job tracking and completion
* Role-based authentication and authorization
* Interactive analytics dashboards
* Category-wise complaint analysis
* Weekly workload visualization
* Priority and status-based filtering
* Principal-only institutional reports
* Resolution and performance metrics
* Responsive mobile-first student interface
* RESTful backend APIs
* WebSocket support

## 🛠️ Tech Stack

### Frontend

* React 18
* Vite
* React Router
* Tailwind CSS
* Recharts
* Axios
* Lucide React

### Backend

* Python 3.12
* FastAPI
* SQLAlchemy 2.0
* Pydantic v2
* SQLite
* PostgreSQL
* asyncpg
* WebSockets

### Authentication

* JWT Authentication
* Role-Based Access Control (RBAC)

### User Roles

* Student
* Authority
* Service Provider
* Principal

# 🏫 Portals & Screens

## 1. Student Portal — Mobile First

The Student Portal allows students to easily report and track campus maintenance issues.

### Features

* **Report an Issue**
* Select complaint category
* Enter complaint description
* Select campus location
* Upload photo evidence
* Upload optional video evidence
* Generate unique ticket code
* View submitted complaints
* Track complaint status
* View complaint timeline and status history

### Example Ticket

```text
#T-8942
```

## 2. Authority Console — Approval Queue

The Authority Console provides maintenance staff with a centralized queue for reviewing submitted complaints.

### Features

* Complaint statistics
* Maintenance request queue
* Priority indicators
* Suggested service provider information
* Weekly workload visualization
* Routine vs Emergency workload
* Operational insights
* Complaint filtering and management

### Weekly Workload

```text
Monday       █████████
Tuesday      ███████
Wednesday    ███████████
Thursday     ██████
Friday       █████████
```

## 3. Authority Console — Approve Maintenance Request

Authorities can open an individual complaint and review all available information before making a decision.

### Request Details

* Ticket ID
* Student complaint
* Category
* Campus location
* Description
* Submitted date
* Current status
* Priority
* Photo evidence
* Video evidence

### Video Evidence

Uploaded videos can be played directly using the browser's native HTML5 video player.

```html
<video controls>
    <source src="evidence.mp4" type="video/mp4">
</video>
```

### Authority Actions

* **Approve**
* **Request Information**
* **Reject**

Human authority always makes the final decision.

## 4. Authority Console — Campus Facilities Overview

The Campus Facilities Overview provides a centralized view of campus maintenance activity.

### Dashboard Components

* Global KPI cards
* Category Breakdown donut chart
* Volume Trends line chart
* Priority Queue
* Complaint statistics
* Resolution statistics

### Complaint Categories

* Plumbing
* Electrical
* Cleaning
* Infrastructure
* HVAC
* Other

## 5. Service Provider Portal

The Service Provider Portal allows technicians and maintenance providers to manage their assigned jobs.

### My Jobs Dashboard

Service providers can view:

* Pending jobs
* Active jobs
* Completed jobs
* Job details
* Campus location
* Complaint description
* Evidence
* Priority
* Assignment information

### Job Actions

```text
[ Accept ]    [ Decline ]
```

### Job Workflow

```text
Assigned
    ↓
Accepted
    ↓
In Progress
    ↓
Completed
```

## 6. Principal Executive Dashboard & Reports

The Principal Portal provides institution-level visibility into campus maintenance operations.

### Executive Dashboard

Includes:

* Total Complaints
* Pending Complaints
* Resolved Complaints
* Active Jobs
* Resolution Metrics
* Category Statistics
* Priority Statistics
* Complaint Trends

# 📊 Principal-Only Reports

The reporting section is accessible only to authorized Principal users.

### Filters

* Date
* Status
* Category
* Priority

### KPI Statistics

The reports dashboard provides institutional KPIs covering:

* Total complaints
* Pending complaints
* Approved complaints
* Rejected complaints
* Active maintenance jobs
* Resolved complaints
* Resolution metrics

### Charts

* Complaint distribution
* Category distribution
* Priority distribution
* Status distribution
* Resolution trends

# 🔐 Authentication & Authorization

CampusAssist uses **JWT-based authentication with Role-Based Access Control (RBAC)**.

| Role             | Access                                         |
| ---------------- | ---------------------------------------------- |
| Student          | Submit and track complaints                    |
| Authority        | Review, approve, reject, and manage complaints |
| Service Provider | Manage assigned maintenance jobs               |
| Principal        | View institutional dashboards and reports      |

# 🗂️ Project Structure

```text
CampusAssist/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── routers/
│   │   ├── services/
│   │   ├── database/
│   │   └── ...
│   │
│   ├── test_e2e.py
│   ├── test_new_features.py
│   ├── requirements.txt
│   └── ...
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── services/
│   │   ├── routes/
│   │   └── ...
│   │
│   ├── package.json
│   ├── vite.config.js
│   └── ...
│
└── README.md
```

# ⚙️ Running Locally

## 1. Clone the Repository

```bash
git clone <your-repository-url>
cd CampusAssist
```

## 2. Backend

```bash
cd backend
python -m venv venv
```

### Windows

```bash
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Backend:

```text
http://localhost:8000
```

FastAPI Documentation:

```text
http://localhost:8000/docs
```

## 3. Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

# 🔑 Demo Credentials

## Authority Admin

```text
Email: admin@campus.edu
Password: password123
```

## Principal

```text
Email: principal@campus.edu
Password: password123
```

## Student

```text
Email: student@campus.edu
Password: password123
```

Students can also register at:

```text
/auth/register
```

Public student submission:

```text
/student
```

## Service Provider

```text
Email: plumber@service.com
Password: password123
```

> **Note:** These credentials are intended for local/demo environments only.

# 🧪 Running Verification Tests

Navigate to the backend:

```bash
cd backend
```

### Full-Stack Test Suite

```bash
.\venv\Scripts\python.exe test_e2e.py
```

### New Features Test Suite

```bash
.\venv\Scripts\python.exe test_new_features.py
```

The feature test suite covers:

* Student Complaint Tracking
* Video Evidence
* Principal Reports

# 🔄 Complaint Management Workflow

```text
Student
   ↓
Submit Complaint
   ↓
Authority Review
   ↓
┌───────────┬─────────────────┬─────────┐
│  Approve  │  Request Info   │ Reject  │
└─────┬─────┴─────────────────┴─────────┘
      ↓
Assign Service Provider
      ↓
Accept Job
      ↓
Work In Progress
      ↓
Completed
      ↓
Complaint Resolved
```

# 🏗️ System Architecture

```text
┌──────────────────────────────────────────┐
│                 Frontend                 │
│              React + Vite               │
│                                          │
│ Student │ Authority │ Provider │ Principal│
└─────────────────────┬────────────────────┘
                      │
               REST API / WebSocket
                      │
                      ▼
┌──────────────────────────────────────────┐
│                 Backend                  │
│                  FastAPI                 │
│                                          │
│ Auth │ Complaints │ Jobs │ Reports       │
└─────────────────────┬────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────┐
│                Database                  │
│          SQLite / PostgreSQL             │
│                                          │
│ Users │ Complaints │ Jobs │ Reports      │
└──────────────────────────────────────────┘
```

# 🎯 Project Objectives

CampusAssist is designed to:

* Digitize campus maintenance complaint management
* Reduce manual complaint tracking
* Provide transparent complaint status tracking
* Improve communication between students and maintenance teams
* Centralize maintenance operations
* Simplify service provider job management
* Provide authorities with operational dashboards
* Give principals institution-level maintenance analytics
* Maintain clear role-based access and accountability

# 🔒 Human-Controlled Decision Making

CampusAssist keeps final decision-making with authorized campus personnel.

Authorities are responsible for:

* Reviewing complaints
* Determining priority
* Approving or rejecting requests
* Assigning service providers
* Reviewing maintenance progress
* Confirming resolution

The system provides the tools and information needed to manage these processes without making autonomous decisions.

# 🚀 Future Improvements

* Email and SMS notifications
* Push notifications
* Advanced complaint search
* Maintenance SLA tracking
* Service provider performance analytics
* Complaint escalation workflows
* Multi-campus support
* Cloud deployment
* Automated database backups
* Audit logs
* Improved real-time notifications
* Integration with campus management systems

# 👨‍💻 Development

CampusAssist demonstrates:

* Modern React application development
* REST API development with FastAPI
* Asynchronous database operations
* JWT authentication
* Role-Based Access Control
* File and media uploads
* Interactive data visualization
* WebSocket communication
* Multi-role application architecture
* End-to-end testing

# 📄 License

This project is intended for educational and demonstration purposes.
