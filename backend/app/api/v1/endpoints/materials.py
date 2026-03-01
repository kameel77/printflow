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


@router.post("/bulk", response_model=List[MaterialResponse], status_code=201)
async def bulk_import_materials(
    materials: List[MaterialCreate],
    db: AsyncSession = Depends(get_db),
):
    """Bulk import materials, updating existing ones based on external_id"""
    result_materials = []
    
    for m_data in materials:
        db_material = None
        if m_data.external_id:
            result = await db.execute(
                select(Material)
                .options(selectinload(Material.variants))
                .where(Material.external_id == m_data.external_id)
            )
            db_material = result.scalar_one_or_none()
            
        if db_material:
            # Update existing material
            db_material.name = m_data.name
            db_material.category = m_data.category
            db_material.description = m_data.description
            
            existing_variants = {v.external_id: v for v in db_material.variants if v.external_id}
            
            for v_data in m_data.variants:
                if v_data.external_id and v_data.external_id in existing_variants:
                    ev = existing_variants[v_data.external_id]
                    for key, value in v_data.model_dump(exclude_unset=True).items():
                        setattr(ev, key, value)
                else:
                    db_material.variants.append(MaterialVariant(**v_data.model_dump()))
        else:
            # Create new material
            db_material = Material(
                name=m_data.name,
                external_id=m_data.external_id,
                category=m_data.category,
                description=m_data.description,
            )
            for v_data in m_data.variants:
                db_material.variants.append(MaterialVariant(**v_data.model_dump()))
            db.add(db_material)
            
        result_materials.append(db_material)
        
    await db.flush()
    for m in result_materials:
        await db.refresh(m, ["variants"])
    
    return result_materials


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
    """Update material with optional variant replacement"""
    result = await db.execute(
        select(Material)
        .options(selectinload(Material.variants))
        .where(Material.id == material_id)
    )
    material = result.scalar_one_or_none()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    update_data = material_update.model_dump(exclude_unset=True)
    variants_data = update_data.pop("variants", None)

    for key, value in update_data.items():
        setattr(material, key, value)

    # Replace variants if provided
    if variants_data is not None:
        # Delete existing variants
        for old_variant in list(material.variants):
            await db.delete(old_variant)
        # Add new variants
        material.variants = [
            MaterialVariant(**v) for v in variants_data
        ]

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
