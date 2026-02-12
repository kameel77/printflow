# Processes endpoint
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.schemas.schemas import ProcessCreate, ProcessResponse

router = APIRouter()

@router.get("", response_model=List[ProcessResponse])
async def list_processes(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """List all processes"""
    # TODO: Implement with actual DB query
    return []

@router.post("", response_model=ProcessResponse)
async def create_process(
    process: ProcessCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create new process"""
    # TODO: Implement with actual DB query
    raise HTTPException(status_code=501, detail="Not implemented yet")

@router.get("/{process_id}", response_model=ProcessResponse)
async def get_process(
    process_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get process by ID"""
    # TODO: Implement with actual DB query
    raise HTTPException(status_code=501, detail="Not implemented yet")
