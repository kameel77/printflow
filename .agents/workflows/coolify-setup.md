---
description: Manual setup guide for Printflow application on a new Coolify server
---

# Setup Guide: Printflow on Coolify

This guide details the steps to deploy the Printflow application (PostgreSQL, Redis, Backend, Celery, and Frontend) to a new Coolify instance.

## 1. Prerequisites
- A working Coolify instance.
- GitHub connection configured in Coolify.
- Access to the `printflow` repository.

## 2. Infrastructure Setup (Databases)

### PostgreSQL
1. Go to **Resources** -> **New Resource** -> **Database** -> **PostgreSQL**.
2. Set the Name (e.g., `printflow-postgres`).
3. Ensure it is connected to the `coolify` network.
4. After creation, note the **Internal Connection String** (e.g., `postgresql://postgres:password@printflow-postgres:5432/postgres`).

### Redis
1. Go to **Resources** -> **New Resource** -> **Database** -> **Redis**.
2. Set the Name (e.g., `printflow-redis`).
3. Ensure it is connected to the `coolify` network.
4. After creation, note the **Internal Connection String** (e.g., `redis://printflow-redis:6379`).

## 3. Application Setup

### Create New Application
1. **Resources** -> **New Resource** -> **Public Repository**.
2. Repository: `wally-sklep/printflow`.
3. Branch: `staging` (or your preferred branch).
4. Build Pack: **Docker Compose**.

### Configure Docker Compose
In the **Configuration** tab, ensure the Docker Compose file points to `./docker-compose.dev.yml` (if that's where your dev/staging config lives).

### Environment Variables
Set the following variables in the **Environment Variables** tab:

| Variable | Value | Notes |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://...` | Use the internal string from Step 2 |
| `REDIS_URL` | `redis://...` | Use the internal string from Step 2 |
| `JWT_SECRET` | `your-secret-key` | Minimum 32 characters |
| `JWT_ALGORITHM` | `HS256` | |
| `DEBUG` | `true` | For staging/dev |
| `ENVIRONMENT` | `staging` | |
| `CORS_ORIGINS` | `*` | Or specific frontend FQDN |
| `NEXT_PUBLIC_API_URL`| `http://backend-fqdn`| Frontend public API endpoint |

### Important: Healthcheck Fix for Celery
Coolify might automatically apply the backend healthcheck to all containers in the compose file. Since `celery_worker` and `celery_beat` don't run web servers, this will cause them to be marked as unhealthy.

Ensure your `docker-compose.dev.yml` has healthchecks disabled for Celery services:
```yaml
  celery_worker:
    ...
    healthcheck:
      test: ["NONE"]
  
  celery_beat:
    ...
    healthcheck:
      test: ["NONE"]
```

## 4. Networking & Domains
1. In the **Domain** settings for the application:
   - Configure the Backend FQDN (e.g., `http://api.staging.example.com`).
   - Configure the Frontend FQDN (e.g., `http://staging.example.com`).
2. Ensure the application is connected to the `coolify` external network to allow communication between Traefik and your containers.

## 5. Deployment
1. Click **Deploy**.
2. Monitor the logs for:
   - Alembic migrations: `alembic upgrade head || (echo 'Tables exist, stamping...' && alembic stamp head)`
   - Python seeding: `python -m app.seed`
   - Next.js build process.
3. Once finished, verify the `/health` endpoint on the backend.

---
**Location of this guide**: `.agents/workflows/coolify-setup.md`
