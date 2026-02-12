# API Router
from fastapi import APIRouter

from app.api.v1.endpoints import materials, processes, templates, quotes, calculations

api_router = APIRouter()

api_router.include_router(materials.router, prefix="/materials", tags=["materials"])
api_router.include_router(processes.router, prefix="/processes", tags=["processes"])
api_router.include_router(templates.router, prefix="/templates", tags=["templates"])
api_router.include_router(quotes.router, prefix="/quotes", tags=["quotes"])
api_router.include_router(calculations.router, prefix="/calculate", tags=["calculations"])
