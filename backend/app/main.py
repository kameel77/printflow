# PrintFlow MIS - Backend Application
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from contextlib import asynccontextmanager

from app.core.config import settings
from app.api.v1.router import api_router
from app.core.database import engine, Base


class NoCacheMiddleware(BaseHTTPMiddleware):
    """Prevent Cloudflare and browsers from caching API responses.

    Without this, Cloudflare CDN caches JSON responses and serves stale data
    (observed: cf-cache-status: HIT with Age: 4905s on /api/v1/ endpoints).
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
            response.headers["Pragma"] = "no-cache"
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown
    await engine.dispose()


app = FastAPI(
    title="PrintFlow MIS API",
    description="Management Information System for print shop quoting",
    version="1.0.0",
    lifespan=lifespan,
)

# Prevent Cloudflare from caching API responses
app.add_middleware(NoCacheMiddleware)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}


@app.get("/")
async def root():
    return {
        "message": "PrintFlow MIS API",
        "docs": "/docs",
        "version": "1.0.0"
    }
