# Coolify Deployment Guide: Next.js + FastAPI + Postgres + Redis

This document outlines the confirmed, working configuration for deploying a multi-container stack (Frontend, Backend, Database) on Coolify using **Docker Compose**. It is based on resolving specific 503 errors and routing issues.

## 1. The Core Architecture

*   **Platform**: Coolify (Self-hosted)
*   **Proxy**: Traefik (Built-in to Coolify)
*   **Deployment Type**: Docker Compose (Application)
*   **Network Strategy**: Use the external `coolify` network for public routing + internal bridge network for service-to-service communication.

---

## 2. "The Golden Setup" (Critical Requirements)

To ensure a stable deployment without 503/404 errors, your `docker-compose.yml` must adhere to these rules:

### A. Networking (The #1 Cause of 503 Errors)
Traefik resides in a specific Docker network (usually named `coolify`). For it to route traffic to your container, **your service must be attached to this network**.

1.  Define the external network at the bottom of your file:
    ```yaml
    networks:
      app_network:    # Your internal network
        driver: bridge
      coolify:        # The critical link to Traefik
        external: true
    ```

2.  Attach services exposed to the web (e.g., Frontend, API) to **both** networks:
    ```yaml
    services:
      frontend:
        # ...
        networks:
          - app_network
          - coolify
    ```

### B. Traefik Routing Labels
Do not rely on auto-detection for complex stacks. Use explicit labels.

**Frontend Service Configuration:**
```yaml
    # Do NOT use 'ports: ["3000:3000"]' to avoid host conflicts.
    expose:
      - "3000" 
    labels:
      - "traefik.enable=true"
      
      # CRITICAL: Force Traefik to use the 'coolify' network interface.
      # Without this, Traefik might try to reach the container via the internal IP (unreachable), causing a 503.
      - "traefik.docker.network=coolify"
      
      # Routing Rule: Use the Coolify-injected variable for the domain
      - "traefik.http.routers.frontend-custom.rule=Host(`${SERVICE_FQDN_FRONTEND}`)"
      
      # internal Entrypoint (defaults usually work, but good to be explicit for web)
      - "traefik.http.routers.frontend-custom.entrypoints=websecure"
      - "traefik.http.routers.frontend-custom.tls.certresolver=letsencrypt" 
      
      # Port Mapping: Tell Traefik which internal port to forward traffic to
      - "traefik.http.services.frontend-custom.loadbalancer.server.port=3000"
```

### C. Healthchecks (The Silent Killer)
If your Dockerfile defines a `HEALTHCHECK` (e.g., `wget localhost:3000`), it might fail inside the Coolify environment due to network isolation or missing tools.
*   **Symptom**: Container status is `Unhealthy` in Docker, even if logs say "Ready".
*   **Result**: Traefik sees "Unhealthy" and stops routing traffic -> **503 Service Unavailable**.
*   **Fix**: Disable the inherited healthcheck in `docker-compose.yml` if you aren't sure it will pass.

```yaml
    healthcheck:
      test: ["NONE"] # DIsables inherited checks from Dockerfile
```

---

## 3. Full Reference Configuration (`docker-compose.yml`)

Use this template for your Next.js + FastAPI deployments.

```yaml
version: '3.8'

services:
  # --- Database (Internal) ---
  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    networks:
      - app_network # Internal only, no need for coolify network

  # --- Backend (Internal + Optional External) ---
  backend:
    build:
      context: ./backend
    restart: unless-stopped
    environment:
      DATABASE_URL: ${DATABASE_URL}
      # CORS must match the Frontend FQDN
      CORS_ORIGINS: ${SERVICE_URL_FRONTEND},https://${SERVICE_FQDN_FRONTEND}
    depends_on:
      postgres:
        condition: service_started
    networks:
      - app_network
      - coolify # Add if you need external API access

  # --- Frontend (Public) ---
  frontend:
    build:
      context: ./frontend
      args:
        # Build-time arg for SSG/ISR if needed
        BACKEND_URL: http://backend:8000
    restart: unless-stopped
    environment:
      # Runtime env for SSR
      BACKEND_URL: http://backend:8000
      # Public URL for client-side fetches (MUST be set in Coolify UI)
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
    expose:
      - "3000"
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=coolify"
      - "traefik.http.routers.frontend.rule=Host(`${SERVICE_FQDN_FRONTEND}`)"
      - "traefik.http.services.frontend.loadbalancer.server.port=3000"
    # Prevent 503s from flaky internal healthchecks
    healthcheck:
      test: ["NONE"]
    networks:
      - app_network
      - coolify

networks:
  app_network:
    driver: bridge
  coolify:
    external: true
```

## 4. Coolify UI Checklist

1.  **Environment Variables**:
    *   Ensure `SERVICE_FQDN_FRONTEND` (and BACKEND if needed) are populated.
    *   Set `NEXT_PUBLIC_API_URL` to the **public** backend URL (or frontend URL if using Next.js API routes proxying).
2.  **Domains**:
    *   Assign domains in the "Domains" section for each service you want valid SSL certificates for.

## Summary of Fixes for "PrintFlow"
1.  **503 Error**: Solved by setting `traefik.docker.network=coolify` AND disabling the failing `healthcheck`.
2.  **404 Error**: Solved by ensuring Traefik labels used the correct `Host()` rule and the container was exposed on the right internal port (`3000`).
3.  **Communication**: Backend and Frontend communicate over the internal `printflow` (bridge) network using service names (`http://backend:8000`).
