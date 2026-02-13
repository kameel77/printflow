# Materials endpoint
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from app.core.database import get_db
from app.models.models import Material, MaterialVariant
from app.schemas.schemas import (
    MaterialCreate,
    MaterialResponse,
    MaterialUpdate,
)

router = APIRouter()


@router.get("", response_model=List[MaterialResponse])
async def list_materials(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """List all materials with their variants"""
    result = await db.execute(
        select(Material)
        .options(selectinload(Material.variants))
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


@router.post("", response_model=MaterialResponse, status_code=201)
async def create_material(
    material: MaterialCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create new material with variants"""
    db_material = Material(
        name=material.name,
        category=material.category,
        description=material.description,
    )
    for v in material.variants:
        db_material.variants.append(
            MaterialVariant(**v.model_dump())
        )
    db.add(db_material)
    await db.flush()
    await db.refresh(db_material, ["variants"])
    return db_material


@router.get("/{material_id}", response_model=MaterialResponse)
async def get_material(
    material_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get material by ID"""
    result = await db.execute(
        select(Material)
        .options(selectinload(Material.variants))
        .where(Material.id == material_id)
    )
    material = result.scalar_one_or_none()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    return material


@router.put("/{material_id}", response_model=MaterialResponse)
async def update_material(
    material_id: int,
    material_update: MaterialUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update material"""
    result = await db.execute(
        select(Material)
        .options(selectinload(Material.variants))
        .where(Material.id == material_id)
    )
    material = result.scalar_one_or_none()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    update_data = material_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(material, key, value)

    await db.flush()
    await db.refresh(material, ["variants"])
    return material


@router.delete("/{material_id}", status_code=204)
async def delete_material(
    material_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete material"""
    result = await db.execute(
        select(Material).where(Material.id == material_id)
    )
    material = result.scalar_one_or_none()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    await db.delete(material)
