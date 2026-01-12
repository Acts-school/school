# Hostinger VPS Deployment Plan

## 0. Objectives

- Run the Next.js School Management System (SMS) and a separate static HTML school website on a **single Hostinger VPS**.
- Use a **production-grade setup**: HTTPS, reverse proxy, health checks, env-based config.
- Keep infrastructure simple: Docker + docker-compose, Nginx as reverse proxy.

---

## 1. High-Level Architecture

- **Hostinger VPS (Linux)**
  - Runs **Docker** and **docker-compose**.
  - Runs **Nginx** as reverse proxy and static file server.

- **Services on the VPS**
  - **Next.js SMS app**
    - Built from this repo via `Dockerfile`.
    - Runs as container, listening on `localhost:3000`.
    - Uses Postgres via Prisma.
  - **PostgreSQL database**
    - Either:
      - Local container from `docker-compose.yml` (`postgres:15`), or
      - External managed Postgres (e.g. Hostinger DB service).
  - **Static HTML school site**
    - Plain HTML/CSS/JS files in `/var/www/school-site` (or similar).
    - Served directly by Nginx.

- **Domains / Routing** (recommended)
  - `https://www.school.com` → **static site** (Nginx serves files).
  - `https://portal.school.com` → **SMS app** (Nginx reverse proxies to `http://localhost:3000`).

---

## 2. Prerequisites

- Active Hostinger VPS with:
  - SSH access.
  - Root or sudo privileges.
- DNS records:
  - `A` record for `www.school.com` → VPS IP.
  - `A` record for `portal.school.com` → VPS IP.
- Basic familiarity with:
  - SSH, Linux shell.
  - Docker + docker-compose.
  - Nginx virtual host configuration.

---

## 3. Application Requirements (From Codebase)

- **Runtime**
  - Node 18 (already baked into `Dockerfile` via `node:18-alpine`).

- **Environment variables (minimum for production)**
  - `DATABASE_URL` – Postgres connection string.
  - `NEXTAUTH_SECRET` – long random string (≥ 32 chars recommended).
  - `NEXT_PUBLIC_APP_URL` – public URL of the portal, e.g. `https://portal.school.com`.
  - `SENTRY_DSN` – optional, for error tracking.

- **Optional integrations**
  - SMS (Africa's Talking):
    - `AFRICASTALKING_USERNAME`
    - `AFRICASTALKING_API_KEY`
    - `AFRICASTALKING_FROM`
  - M-Pesa:
    - To be provided as `MPESA_*` env vars (e.g. `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY`, `MPESA_SHORTCODE`, callback base URL).

- **Database**
  - Postgres 15 (matching `docker-compose.yml`).
  - Prisma migrations run via `npx prisma migrate deploy` (already invoked in `Dockerfile` `CMD`).

---

## 4. VPS Setup Steps

### 4.1 Install System Dependencies

On the VPS:

- Install updates.
- Install Docker and docker-compose (Hostinger docs or standard Docker instructions).
- Install Nginx via the system package manager.

_No app code changes are required for this step._

### 4.2 Clone the Repository

- SSH into the VPS.
- Choose an app directory, e.g. `/opt/sms`.
- Clone the repo there.

Example (conceptual):
- `git clone <repo-url> /opt/sms`

### 4.3 Configure Environment Variables

In `/opt/sms`:

- Create `.env` (or update existing) with **production** values, based on `.env.example`:
  - Override DB values with production credentials.
  - Set:
    - `DATABASE_URL=postgresql://user:pass@db-host:5432/dbname?sslmode=require` (or local container address).
    - `NEXTAUTH_SECRET=<long-random-string>`.
    - `NEXT_PUBLIC_APP_URL=https://portal.school.com`.
    - Optional: `SENTRY_DSN`, `AFRICASTALKING_*`, `MPESA_*`.

**Note:** In production, avoid committing `.env` to git; keep it only on the server.

---

## 5. Docker / Compose Strategy

### 5.1 Option A – Local Postgres Container (simple, all-in-one)

Use the existing `docker-compose.yml` with minor production adjustments:

- Services defined:
  - `postgres`: `postgres:15`, exposes `5432`.
  - `app`: builds from `Dockerfile`, exposes `3000`.

**Recommended production tweaks** (conceptual changes to `docker-compose.yml`):

- Bind the app container only to localhost:
  - `ports: ["127.0.0.1:3000:3000"]` (Nginx will proxy to this).
- Use strong passwords and non-default DB name via `.env`.
- Ensure `DATABASE_URL` points to `postgres` service hostname, e.g.:
  - `postgresql://appuser:appsecret@postgres:5432/appdb`.

### 5.2 Option B – Managed Postgres (external DB)

- Do not run a Postgres container.
- Provision a Postgres instance (e.g. Hostinger-managed DB).
- Set `DATABASE_URL` to that external instance.
- Optionally remove or disable the `postgres` service in `docker-compose.yml`.

**Trade-off:**

- Local Postgres: simpler to manage on one VPS but you maintain backups.
- Managed Postgres: less ops, likely better durability and scaling.

---

## 6. Running the Stack

### 6.1 Build and Start Services

In `/opt/sms`:

- `docker-compose up -d` (after you are satisfied with any production tweaks).

What happens:

- Docker builds the Next.js app image using the multi-stage `Dockerfile`.
- Builds Next.js for production, runs Prisma generate.
- Starts the `app` container.
- On container start, `npx prisma migrate deploy` runs and then `next start -p 3000`.

### 6.2 Verify Health

- Check container health status using Docker.
- Visit `http://localhost:3000` **from inside the VPS** (e.g. `curl` or SSH port forwarding) to confirm the app works before wiring Nginx.

---

## 7. Nginx Configuration

### 7.1 Static HTML School Website

- Place static files in `/var/www/school-site` (or similar).
- Ensure correct file permissions for the web server user.

Nginx server block (conceptual):

- `server_name www.school.com;`
- `root /var/www/school-site;`
- `index index.html;`
- Serve static content directly.

### 7.2 SMS Portal Reverse Proxy

Another Nginx server block (conceptual):

- `server_name portal.school.com;`
- `location / { proxy_pass http://127.0.0.1:3000; ... }`
- Include standard proxy headers (X-Forwarded-For, X-Forwarded-Proto, Host).

### 7.3 TLS / HTTPS

- Use Lets Encrypt or Hostinger-provided SSL.
- Configure HTTPS on both `www.school.com` and `portal.school.com`.
- Redirect HTTP (`:80`) to HTTPS (`:443`).

**Note:** `NEXT_PUBLIC_APP_URL` must match the **HTTPS URL** the app is actually served from.

---

## 8. Linking Static Site to SMS Portal

- On the static site, add links like:
  - Parent / Staff portal: `https://portal.school.com`.

No changes are required in the SMS app code for this; it is just a URL.

---

## 9. Webhooks and Callbacks (M-Pesa, SMS)

- Ensure your public callback URLs point to the **portal domain**, e.g.:
  - `https://portal.school.com/api/mpesa/callback`
  - Future C2B endpoints: `https://portal.school.com/api/mpesa/c2b/confirm` etc.
- Configure these URLs in the Safaricom portal / SMS provider dashboard.

**Requirement:** These endpoints must be reachable over HTTPS and not blocked by firewalls.

---

## 10. Operations and Maintenance

### 10.1 Logs and Monitoring

- Inspect logs via Docker (`docker logs`) or configure a central log solution.
- Optionally integrate Sentry using `SENTRY_DSN`.

### 10.2 Backups

- If using local Postgres:
  - Schedule regular logical backups (`pg_dump`) or volume snapshots.
- If using managed Postgres:
  - Ensure automatic backups are enabled and retention meets requirements.

### 10.3 Updates / Deployments

- Pull latest changes from git.
- Rebuild and restart:
  - `docker-compose build app`
  - `docker-compose up -d app`
- Migrations:
  - Automatically run on app start (via `prisma migrate deploy` in `CMD`).

---

## 11. Acceptance Criteria

- `https://www.school.com` serves the static school website.
- `https://portal.school.com` serves the SMS application.
- Users can log in, use core features, and data persists in Postgres.
- HTTPS is enforced everywhere.
- M-Pesa and SMS callbacks (if configured) successfully hit the Next.js API endpoints.
