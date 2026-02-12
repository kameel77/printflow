# Materials endpoint
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.schemas.schemas import MaterialCreate, MaterialResponse

router = APIRouter()

@router.get("", response_model=List[MaterialResponse])
async def list_materials(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """List all materials with their variants"""
    # TODO: Implement with actual DB query
    return []

@router.post("", response_model=MaterialResponse)
async def create_material(
    material: MaterialCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create new material with variants"""
    # TODO: Implement with actual DB query
    raise HTTPException(status_code=501, detail="Not implemented yet")

@router.get("/{material_id}", response_model=MaterialResponse)
async def get_material(
    material_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get material by ID"""
    # TODO: Implement with actual DB query
    raise HTTPException(status_code=501, detail="Not implemented yet")
