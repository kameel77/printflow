# Templates endpoint
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from app.core.database import get_db
from app.models.models import ProductTemplate, TemplateComponent
from app.schemas.schemas import (
    ProductTemplateCreate,
    ProductTemplateResponse,
    ProductTemplateUpdate,
)

router = APIRouter()


@router.get("", response_model=List[ProductTemplateResponse])
async def list_templates(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """List all product templates"""
    result = await db.execute(
        select(ProductTemplate)
        .options(selectinload(ProductTemplate.components))
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


@router.post("", response_model=ProductTemplateResponse, status_code=201)
async def create_template(
    template: ProductTemplateCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create new product template"""
    db_template = ProductTemplate(
        name=template.name,
        description=template.description,
        default_margin_w_cm=template.default_margin_w_cm,
        default_margin_h_cm=template.default_margin_h_cm,
        default_overlap_cm=template.default_overlap_cm,
        is_active=template.is_active,
    )
    for comp in template.components:
        db_template.components.append(
            TemplateComponent(**comp.model_dump())
        )
    db.add(db_template)
    await db.flush()
    await db.refresh(db_template, ["components"])
    return db_template


@router.get("/{template_id}", response_model=ProductTemplateResponse)
async def get_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get template by ID"""
    result = await db.execute(
        select(ProductTemplate)
        .options(selectinload(ProductTemplate.components))
        .where(ProductTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.put("/{template_id}", response_model=ProductTemplateResponse)
async def update_template(
    template_id: int,
    template_update: ProductTemplateUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update product template"""
    result = await db.execute(
        select(ProductTemplate)
        .options(selectinload(ProductTemplate.components))
        .where(ProductTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    update_data = template_update.model_dump(exclude_unset=True)

    # Handle components separately if provided
    components_data = update_data.pop("components", None)
    for key, value in update_data.items():
        setattr(template, key, value)

    # Replace components if provided
    if components_data is not None:
        # Remove old components
        for old_comp in template.components:
            await db.delete(old_comp)
        template.components.clear()

        # Add new components
        for comp_data in components_data:
            template.components.append(
                TemplateComponent(**comp_data)
            )

    await db.flush()
    await db.refresh(template, ["components"])
    return template


@router.delete("/{template_id}", status_code=204)
async def delete_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete product template"""
    result = await db.execute(
        select(ProductTemplate).where(ProductTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    await db.delete(template)
