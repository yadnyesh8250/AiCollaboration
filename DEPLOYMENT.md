# A-Collab Deployment Guide (Phase B Infrastructure)

This guide documents the setup, execution, environment verification, caching, and production operations for the A-Collab backend service.

---

## 📋 Table of Contents
1. [Environment Variables](#1-environment-variables)
2. [Local Development](#2-local-development)
3. [Docker & Docker Compose](#3-docker--docker-compose)
4. [Production Deployment with PM2](#4-production-deployment-with-pm2)
5. [Health Checks & Monitoring](#5-health-checks--monitoring)
6. [Caching & Observability](#6-caching--observability)

---

## 1. Environment Variables

Boot-time validation is enforced by [env.js](file:///Users/yadnyesh8250/Desktop/A-collab/backend/src/config/env.js). If any required variable is missing, the application logs the error via Pino and exits fast (exit code `1`).

| Variable Name | Description | Example / Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | MySQL Connection URI | `mysql://root:pass@localhost:3306/collabai` |
| `JWT_SECRET` | Secret key to sign JWT Access Tokens | `your-secret-access-token-key` |
| `JWT_REFRESH_SECRET` | Secret key to sign JWT Refresh Tokens | `your-secret-refresh-token-key` |
| `GEMINI_API_KEY` | Google Generative AI API Key | `AIzaSy...` |
| `REDIS_URL` | Redis instance connection URI | `redis://localhost:6379` |
| `PORT` | Express Server listen port | `5001` (Default: `5000`) |
| `LOG_LEVEL` | Logging filter level | `info` (or `debug` / `warn` / `error`) |

---

## 2. Local Development

### Prerequisites
- Node.js `v20.x` or later
- MySQL running locally or remotely
- Redis running locally or remotely (fallback enabled if Redis is offline)

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

### Step 2: Set up Environment
Create a `.env` file inside `backend/` and configure your credentials.

### Step 3: Run Database Migrations
```bash
npx prisma migrate dev
```

### Step 4: Run Dev Server
```bash
npm run dev
```
The server will listen on port `5001` (to bypass macOS default AirPlay conflict on `5000`).

---

## 3. Docker & Docker Compose

Docker Compose builds the entire service mesh: `backend`, `mysql`, and `redis`. All volumes persist.

### Build and Launch the Stack
Run this from the workspace root directory:
```bash
docker-compose up --build -d
```

### How waiting for MySQL and Redis works
- Compose uses `service_healthy` conditions.
- MySQL runs a container healthcheck using `mysqladmin ping`.
- Redis runs a container healthcheck using `redis-cli ping`.
- The `backend` container waits to launch until both health checks return successfully.
- Once ready, the backend automatically runs `npx prisma migrate deploy` to synchronize the schema before booting.

### Stop the Containers
```bash
docker-compose down
```

---

## 4. Production Deployment with PM2

PM2 clusters the Express backend across all available CPU cores for zero-downtime reloads and automatic restarts.

### Prerequisites
Install PM2 globally:
```bash
npm install -g pm2
```

### Launch Cluster Mode
From the `backend/` directory:
```bash
pm2 start ecosystem.config.js --env production
```

### Manage Processes
- **List processes:** `pm2 list`
- **View logs:** `pm2 logs`
- **Stop app:** `pm2 stop acollab-backend`
- **Reload zero-downtime:** `pm2 reload acollab-backend`

---

## 5. Health Checks & Monitoring

The backend exposes three standardized health-checking routes at the root:

### 1. GET `/live` (Liveness)
- Returns `200 OK` if the Express process is running. Used by Kubernetes/Docker.
- **Response:**
  ```json
  { "status": "UP" }
  ```

### 2. GET `/ready` (Readiness)
- Queries the Database (`SELECT 1`) and pings Redis. Returns `200 OK` only if both are online, otherwise returns `503 Service Unavailable`.
- **Response:**
  ```json
  { "status": "READY" }
  ```

### 3. GET `/health` (Detailed Diagnostics)
- Returns detailed memory allocations, version, service statuses, and host uptime.
- **Response:**
  ```json
  {
    "status": "UP",
    "version": "1.0.0",
    "uptimeSeconds": 142,
    "timestamp": "2026-07-08T13:35:48.000Z",
    "services": {
      "database": "UP",
      "redis": "UP",
      "gemini": "CONFIGURED"
    },
    "system": {
      "memoryUsageMB": {
        "rss": 48,
        "heapTotal": 32,
        "heapUsed": 24,
        "external": 2
      }
    }
  }
  ```

---

## 6. Caching & Observability

### Redis AI Caching
All non-streaming AI requests (via `queryModel`) are hashed and cached inside Redis for `1 hour` (TTL: `3600s`). This optimizes cost and provides microsecond latencies for repeated queries.

### Structured Logging (Pino)
Logs are structured as JSON. Child loggers isolate contexts so they can be parsed by monitoring tools:
- `httpLogger` (`category: "http"`): Records HTTP requests, status codes, and latencies.
- `workerLogger` (`category: "worker"`): Background node-cron job updates.
- `aiLogger` (`category: "ai"`): Google Gemini model calls and caching hits.
- `socketLogger` (`category: "socket"`): Socket.io user events.
- `errorLogger` (`category: "error"`): Centralized unhandled exceptions stacktraces.
