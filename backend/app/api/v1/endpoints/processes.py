# Processes endpoint
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.database import get_db
from app.models.models import Process
from app.schemas.schemas import ProcessCreate, ProcessResponse, ProcessUpdate

router = APIRouter()


@router.get("", response_model=List[ProcessResponse])
async def list_processes(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """List all processes"""
    result = await db.execute(
        select(Process).offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.post("", response_model=ProcessResponse, status_code=201)
async def create_process(
    process: ProcessCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create new process"""
    db_process = Process(**process.model_dump())
    db.add(db_process)
    await db.flush()
    await db.refresh(db_process)
    return db_process


@router.get("/{process_id}", response_model=ProcessResponse)
async def get_process(
    process_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get process by ID"""
    result = await db.execute(
        select(Process).where(Process.id == process_id)
    )
    process = result.scalar_one_or_none()
    if not process:
        raise HTTPException(status_code=404, detail="Process not found")
    return process


@router.put("/{process_id}", response_model=ProcessResponse)
async def update_process(
    process_id: int,
    process_update: ProcessUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update process"""
    result = await db.execute(
        select(Process).where(Process.id == process_id)
    )
    process = result.scalar_one_or_none()
    if not process:
        raise HTTPException(status_code=404, detail="Process not found")

    update_data = process_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(process, key, value)

    await db.flush()
    await db.refresh(process)
    return process


@router.delete("/{process_id}", status_code=204)
async def delete_process(
    process_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete process"""
    result = await db.execute(
        select(Process).where(Process.id == process_id)
    )
    process = result.scalar_one_or_none()
    if not process:
        raise HTTPException(status_code=404, detail="Process not found")

    await db.delete(process)
