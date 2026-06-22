from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.database import get_db
from app.models.models import ProductCategory
from app.schemas.schemas import (
    ProductCategoryCreate,
    ProductCategoryResponse,
    ProductCategoryUpdate,
)

router = APIRouter()


@router.get("", response_model=List[ProductCategoryResponse])
async def list_categories(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """List all product categories"""
    result = await db.execute(
        select(ProductCategory)
        .order_by(ProductCategory.sort_order)
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


@router.post("", response_model=ProductCategoryResponse, status_code=201)
async def create_category(
    category: ProductCategoryCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create new product category"""
    db_category = ProductCategory(
        name=category.name,
        description=category.description,
        sort_order=category.sort_order,
        is_active=category.is_active,
    )
    db.add(db_category)
    await db.flush()
    await db.refresh(db_category)
    return db_category


@router.get("/{category_id}", response_model=ProductCategoryResponse)
async def get_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get category by ID"""
    result = await db.execute(
        select(ProductCategory).where(ProductCategory.id == category_id)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.put("/{category_id}", response_model=ProductCategoryResponse)
async def update_category(
    category_id: int,
    category_update: ProductCategoryUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update product category"""
    result = await db.execute(
        select(ProductCategory).where(ProductCategory.id == category_id)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    update_data = category_update.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(category, key, value)

    await db.flush()
    await db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=204)
async def delete_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete product category"""
    result = await db.execute(
        select(ProductCategory).where(ProductCategory.id == category_id)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    await db.delete(category)
