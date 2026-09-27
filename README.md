# CampusAssist AI

**CampusAssist AI** is a full-stack, AI-assisted campus maintenance complaint management system. Human authority always makes the final call — AI classifies, prioritizes, and recommends verified service providers.

## Tech Stack
- **Frontend:** React 18 (Vite), React Router, Tailwind CSS, Recharts, Axios, Lucide React
- **Backend:** Python 3.12, FastAPI (async), SQLAlchemy 2.0 (async), Pydantic v2, SQLite / PostgreSQL (asyncpg), WebSockets
- **AI Pipeline:** Google Gemini API with multi-agent pipeline (`ClassifierAgent`, `PriorityAgent`, `DuplicateDetectionAgent`, `RecommendationAgent`, `Orchestrator`)
- **Authentication:** JWT RBAC (Student unauthenticated, Authority, Service Provider, Principal)

## 4 Portals & 6 Screens
1. **Student Portal (Mobile-First):** "Report an Issue" with category, description, campus location, photo & optional video evidence upload. Generates ticket code (e.g. `#T-8942`). Includes **Student Complaint Tracking ("My Complaints")** with timeline/status history.
2. **Authority Console — Approval Queue:** Stat cards, AI Priority colored pills, Suggested Technician with match %, Weekly Workload bar chart (Mon-Fri Routine vs Emergency), and AI Insights card.
3. **Authority Console — Approve Maintenance Request:** Detailed request view with photo and playable HTML5 video evidence, AI Recommendation card (match %, estimated time, priority), and Authority actions (Approve, Request Info, Reject).
4. **Authority Console — Campus Facilities Overview:** Global KPI cards, Category Breakdown donut chart, Volume Trends line chart, and Priority Queue.
5. **Service Provider Portal:** "My Jobs" dashboard with pending job cards (Accept / Decline), filter toggles (AI recommended, High Priority), and active job completion.
6. **Principal Executive Dashboard & Reports:** Institutional KPI analytics, and **Principal-Only Reports** page with date/status/category/priority filters, 7 KPI stat cards, distribution charts, and resolution metrics.

## Running Locally

### 1. Backend
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. Demo Credentials
- **Authority Admin:** `admin@campus.edu` / `password123`
- **Principal:** `principal@campus.edu` / `password123`
- **Student:** `student@campus.edu` / `password123` (or self-register at `/auth/register` / public submission at `/student`)
- **Service Provider (Plumber):** `plumber@service.com` / `password123`

### 4. Running Verification Tests
```bash
cd backend
.\venv\Scripts\python.exe test_e2e.py            # Original full-stack test suite
.\venv\Scripts\python.exe test_new_features.py   # Test suite for Student Tracking, Video Evidence & Principal Reports
```
