# PrintFlow MIS

Management Information System for print shop quoting and production management.

## Local Development

### Quick Start (Backend Only)

```bash
# Navigate to backend
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the application
uvicorn app.main:app --reload --port 8000
```

The API will be available at:
- API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

### Test the Calculation Engine

```bash
# Calculate a quote
curl -X POST http://localhost:8000/api/v1/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "width_cm": 100,
    "height_cm": 100,
    "quantity": 1,
    "template_id": 1
  }'
```

### Full Stack (Docker)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop everything
docker-compose down
```

## API Endpoints

- `POST /api/v1/calculate` - Calculate quote
- `GET /api/v1/calculate/templates` - List templates
- `GET /api/v1/materials` - List materials
- `GET /api/v1/processes` - List processes
- `GET /api/v1/quotes` - List quotes

## Project Structure

```
printflow/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/    # API routes
│   │   ├── core/                # Config, database
│   │   ├── engine/              # Calculation engine
│   │   ├── models/              # SQLAlchemy models
│   │   ├── schemas/             # Pydantic schemas
│   │   └── main.py              # FastAPI app
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── app/                     # Next.js pages
│   ├── components/              # React components
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── AGENTS.md
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `GOOGLE_CLIENT_ID` - OAuth2 client ID

## Development Status

- ✅ Basic FastAPI application
- ✅ Calculation engine with Best-Fit algorithm
- ✅ Paneling (splitting) with overlap
- ✅ Docker compose setup
- 🔄 Database integration (in progress)
- 🔄 Frontend UI (in progress)
- ⏳ Gmail integration
- ⏳ PDF generation
- ⏳ Celery background tasks
