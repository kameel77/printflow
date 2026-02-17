# AGENTS.md - PrintFlow MIS

Guidelines for AI agents working on the PrintFlow MIS project.

## Project Overview
PrintFlow MIS is a Management Information System for print shop quoting and production management. It replaces Google Sheets with a dedicated web application for automated product pricing and workflow management.

## Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL 15+
- **ORM**: SQLAlchemy 2.0 with Alembic migrations
- **Authentication**: OAuth2 with JWT + Google OAuth2
- **Task Queue**: Celery with Redis
- **PDF Generation**: WeasyPrint
- **Email**: Gmail API (OAuth2)

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod

### Infrastructure
- **Server**: Ubuntu 22.04/24.04 on Hetzner VPS
- **Deployment**: Docker + Docker Compose
- **Reverse Proxy**: Nginx
- **SSL**: Let's Encrypt (Certbot)
- **Platform**: Coolify (PaaS for deployment)

## Commands

### Development
```bash
# Start all services
docker-compose up -d

# Backend only
cd backend && uvicorn main:app --reload --port 8000

# Frontend only
cd frontend && npm run dev

# Database migrations
cd backend && alembic revision --autogenerate -m "description"
cd backend && alembic upgrade head
```

### Testing
```bash
# Run all tests
pytest

# Run single test file
pytest tests/test_engine.py -v

# Run specific test
pytest tests/test_engine.py::TestCalculationEngine::test_best_fit -v

# With coverage
pytest --cov=app --cov-report=html
```

### Linting & Formatting
```bash
# Python
ruff check .
ruff format .

# Type checking
mypy app/

# Frontend
npm run lint
npm run format
```

## Code Style

### Python (Backend)
- **Imports**: stdlib → third-party → local (each group alphabetically)
- **Formatting**: Ruff with line length 100
- **Types**: Strict typing required (mypy --strict)
- **Naming**: snake_case for functions/variables, PascalCase for classes
- **Error Handling**: Use custom exceptions, never bare except
- **Decimal**: Use Decimal for all financial calculations

### TypeScript (Frontend)
- **Imports**: React → libraries → components → utils
- **Formatting**: Prettier with 2 spaces
- **Types**: Explicit return types on functions
- **Naming**: camelCase for functions/variables, PascalCase for components
- **Components**: Function components with explicit Props interface

### Database
- **Naming**: snake_case for tables/columns
- **Enums**: PostgreSQL native enums for statuses
- **Migrations**: Always generate via Alembic, never manual
- **Soft Deletes**: Use deleted_at timestamps, never hard delete

### Git
- **Branch naming**: feature/description, bugfix/description, hotfix/description
- **Commits**: Conventional commits (feat:, fix:, refactor:, docs:)
- **No secrets**: Never commit .env files or credentials

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── api/           # FastAPI routes
│   │   ├── core/          # Config, security, logging
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic models
│   │   ├── services/      # Business logic
│   │   └── engine/        # Calculation engine
│   ├── alembic/           # Database migrations
│   └── tests/
├── frontend/
│   ├── app/               # Next.js App Router
│   ├── components/        # React components
│   ├── lib/               # Utils, hooks
│   └── types/             # TypeScript definitions
├── docker-compose.yml
└── AGENTS.md
```

## Security Requirements
- All API endpoints require authentication (except /health, /auth/login)
- RBAC: ADMIN | SALES | PRODUCTION roles
- Input validation via Pydantic schemas
- SQL injection prevention via SQLAlchemy ORM
- CORS configured for specific origins only
- Environment variables for all secrets
- Audit logs for all price changes and quote status updates

## Calculation Engine Rules
- Use Decimal for all calculations to avoid floating-point errors
- Best-Fit algorithm selects optimal material variant
- Paneling (splitting) activates when gross dimensions exceed roll width
- Hierarchical margins: Product → Process → Material
- Always snapshot prices in quote_components (archival integrity)
- Tech margins applied_w/h stored for production visibility

## Deployment Checklist
- [ ] Environment variables configured in Coolify
- [ ] PostgreSQL backups scheduled (daily at 3 AM)
- [ ] SSL certificates auto-renew
- [ ] Fail2Ban configured
- [ ] UFW firewall active (ports 22, 80, 443 only)
- [ ] Gmail API credentials uploaded
- [ ] Health check endpoint responding

## Testing Requirements
- Unit tests for calculation engine (100% coverage)
- Integration tests for API endpoints
- Frontend component tests with React Testing Library
- E2E tests for critical flows (quote → send → accept)

## AI-Assisted Coding
When using AI (Claude, Cursor, Copilot):
1. Review all generated code for security issues
2. Ensure type safety (no `any` types in TS)
3. Verify error handling paths
4. Check for hardcoded values that should be env vars
5. Run linter before committing AI-generated code

## Key Documentation (MUST READ)

> **Before making infrastructure, deployment, or database changes — read relevant docs first!**

| Document | Path | What it covers |
| -------- | ---- | -------------- |
| **Deployment & Operations Guide** | `coolify_deployment_learnings.md` | Coolify/Traefik networking, database management, Alembic migrations, seed data, admin panel CRUD, troubleshooting, deployment workflows |
| **This file (AGENTS.md)** | `AGENTS.md` | Project structure, tech stack, code style, commands |
| **Environment template** | `.env.example` | All required environment variables |

### When to consult `coolify_deployment_learnings.md`:
- Adding/changing database schema → **Alembic migration workflow** (section 4)
- Deployment issues (503, unhealthy, etc.) → **Troubleshooting** (section 10)
- Resetting database or fixing seed issues → **Database** (section 3) + **Seed** (section 5)
- Changing tooltips or admin panel data → **Panel Admin** (section 6)
- Understanding startup sequence → **Startup** (section 8)
- Frontend env var changes → **Frontend** (section 7) — remember `NEXT_PUBLIC_*` requires rebuild!

### Database Schema Changes Workflow (Quick Reference)
```bash
# 1. Edit model: backend/app/models/models.py
# 2. Generate migration:
cd backend && alembic revision --autogenerate -m "description"
# 3. Review generated file in alembic/versions/
# 4. Test locally:
alembic upgrade head
# 5. Commit & push — deployment runs alembic upgrade head automatically
```

### File Locations Quick Reference
```
backend/app/models/models.py     → Database models (source of truth for schema)
backend/alembic/versions/        → Migration files
backend/app/seed.py              → Initial data seeder (idempotent)
backend/app/core/config.py       → App settings (DATABASE_URL, JWT, CORS)
backend/app/core/database.py     → SQLAlchemy engine & session
frontend/app/admin/page.tsx      → Admin panel (CRUD for templates, materials, processes)
frontend/components/Tooltip.tsx  → Tooltip component
docker-compose.dev.yml           → Dev/Coolify deployment config
```

