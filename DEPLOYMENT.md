# CampusAssist Production Deployment Guide (Single Linux VPS)

This guide provides instructions for deploying **CampusAssist** on a single Linux Virtual Private Server (Ubuntu 22.04 / 24.04 LTS recommended) using Docker Compose, Nginx, PostgreSQL 16, and Let's Encrypt SSL/HTTPS.

---

## 1. Production Architecture Overview

```text
               Internet (Students & Staff)
                          │
                          ▼
             Nginx Edge Proxy (Ports 80 / 443 SSL)
                          │
        ┌─────────────────┼──────────────────┐
        │                 │                  │
        ▼                 ▼                  ▼
React Production SPA   /api/ -> FastAPI    /ws/ -> FastAPI
(HTML/JS/CSS Assets)   Backend (Port 8000) WebSocket (Upgrades)
                               │
               ┌───────────────┴───────────────┐
               │                               │
               ▼                               ▼
       PostgreSQL 16 Engine        Persistent Uploads Volume
    (Internal Network Only)      (Complaint Photos & Videos)
```

- **Domain Access:** Users access `https://your-domain.com/` directly. No raw ports (`:5173`, `:8000`, `:5432`) are exposed publicly.
- **Student Flow:** Mobile-first QR code scanning (`https://your-domain.com/student?location=...`), touch-friendly camera photo and video evidence upload, instant tracking code.
- **Administrative Portals:** Desktop-first dashboards for Authority (`/authority/queue`), Service Providers (`/provider/dashboard`), and Principal (`/principal/analytics`).

---

## 2. Server Prerequisites

On your clean Linux VPS:
```bash
# Update package list and install basic utilities
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ufw

# Install Docker & Docker Compose plugin
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
# Log out and log back in or run:
newgrp docker

# Verify installation
docker --version
docker compose version
```

### Configure UFW Firewall
Only ports 22 (SSH), 80 (HTTP), and 443 (HTTPS) should be publicly accessible:
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 3. Clone Repository & Setup Environment

```bash
# Clone the repository
git clone <YOUR_REPOSITORY_URL> /opt/campusassist
cd /opt/campusassist/campusAI

# Copy production environment template
cp .env.example .env
```

### Generate Production Secrets
Generate a strong random JWT secret:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Edit `.env` using your favorite editor:
```bash
nano .env
```
Ensure the following variables are configured:
```env
ENVIRONMENT=production
POSTGRES_USER=campus_user
POSTGRES_PASSWORD=<STRONG_RANDOM_PASSWORD>
POSTGRES_DB=campus_ai
DATABASE_URL=postgresql+asyncpg://campus_user:<STRONG_RANDOM_PASSWORD>@postgres:5432/campus_ai
JWT_SECRET=<YOUR_GENERATED_64_CHAR_HEX_KEY>
ACCESS_TOKEN_EXPIRE_MINUTES=1440
GEMINI_API_KEY=<YOUR_GOOGLE_GEMINI_KEY>
GEMINI_MODEL=gemini-2.5-flash
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com
UPLOAD_DIR=/app/uploads
```

---

## 4. Build and Start the Docker Services

Build the images (FastAPI backend + React frontend with internal Nginx):
```bash
docker compose build
```

Start the containers in detached mode:
```bash
docker compose up -d
```

Check container status and logs:
```bash
docker compose ps
docker compose logs -f
```

---

## 5. Run Alembic Database Migrations

Apply the migration history to initialize PostgreSQL tables:
```bash
docker compose exec backend alembic upgrade head
```

Verify that the migrations ran successfully:
```bash
docker compose exec backend alembic current
```
*(Expected output: `a1b2c3d4e5f6 (head)`)*

---

## 6. Seed Initial Administrative Accounts

Initialize clean administrative accounts:
```bash
docker compose exec backend python -m app.seed
```

Default credentials created:
| Role | Email | Password | Portal Route |
|------|-------|----------|--------------|
| **Authority Admin** | `admin@campus.edu` | `password123` | `/authority/queue` |
| **Principal** | `principal@campus.edu` | `password123` | `/principal/analytics` |
| **Service Provider** | `provider@campus.edu` | `password123` | `/provider/dashboard` |
| **Demo Student** | `student@campus.edu` | `password123` | `/student/my-complaints` |

*(Users can change passwords after first login).*

---

## 7. Domain, Nginx & SSL Setup (HTTPS via Let's Encrypt)

Point your domain's DNS `A` record to your VPS Public IP:
- `your-domain.com` -> `YOUR_VPS_IP`
- `www.your-domain.com` -> `YOUR_VPS_IP`

### Option A: Automatic SSL with Host Nginx + Certbot (Recommended)
Install Certbot on the VPS:
```bash
sudo apt install -y certbot python3-certbot-nginx
```

Copy the production site config:
```bash
sudo cp nginx/campus_ai.conf /etc/nginx/sites-available/campus_ai
# Edit your domain name in the config
sudo nano /etc/nginx/sites-available/campus_ai
sudo ln -s /etc/nginx/sites-available/campus_ai /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Obtain Let's Encrypt SSL certificate:
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### Option B: Docker-based SSL
If terminating SSL inside Docker, mount your `/etc/letsencrypt` folder into `campus_ai_frontend` and expose port `443:443` in `docker-compose.yml`.

---

## 8. Backup & Maintenance Procedures

### PostgreSQL Database Backup
```bash
# Create an on-demand database dump
docker compose exec postgres pg_dump -U campus_user campus_ai > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Database
```bash
cat backup_file.sql | docker compose exec -T postgres psql -U campus_user -d campus_ai
```

### Backup Uploaded Photos & Videos
```bash
docker run --rm -v campus_ai_uploads_data:/volume -v $(pwd):/backup alpine tar czf /backup/uploads_$(date +%Y%m%d).tar.gz -C /volume .
```

---

## 9. Verification & Smoke Test Checklist

- [ ] `curl -k https://your-domain.com/health` returns `{"status":"healthy"}`
- [ ] Scanning QR code `https://your-domain.com/student?location=Science%20Building%20Room%20101` pre-fills the location field
- [ ] Submitting a complaint with photo / video upload completes with `#REQ-XXXX` reference code
- [ ] Navigating to `https://your-domain.com/track?track=#REQ-XXXX` loads live complaint timeline
- [ ] Refreshing on any React route (e.g., `/student`, `/login`, `/authority/overview`) does NOT result in an Nginx 404
- [ ] Authority Admin can log in at `/login` and approve / assign complaints
- [ ] Service Provider can log in and update complaint progress
- [ ] Principal can view live campus analytics
