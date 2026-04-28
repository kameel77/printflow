# Processes endpoint
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
import logging

from app.core.database import get_db
from app.models.models import Process, ProcessLaborEntry, LaborRateSettings
from app.schemas.schemas import ProcessCreate, ProcessResponse, ProcessUpdate

router = APIRouter()
logger = logging.getLogger(__name__)


async def _compute_time_prices(db: AsyncSession, process: Process) -> None:
    """For TIME processes, compute unit_price and internal_cost from labor entries + rates."""
    if process.method.value != "TIME" or not process.labor_entries:
        return

    result = await db.execute(select(LaborRateSettings).limit(1))
    rates = result.scalar_one_or_none()
    if not rates:
        return

    rate_map = {
        "EASY": Decimal(str(rates.easy_rate)),
        "MEDIUM": Decimal(str(rates.medium_rate)),
        "HARD": Decimal(str(rates.hard_rate)),
    }
    markup_map = {
        "EASY": Decimal(str(rates.easy_markup or 0)),
        "MEDIUM": Decimal(str(rates.medium_markup or 0)),
        "HARD": Decimal(str(rates.hard_markup or 0)),
    }

    total_cost = Decimal("0")
    total_price = Decimal("0")
    for entry in process.labor_entries:
        minutes = Decimal(str(entry.minutes))
        difficulty = entry.difficulty.value if hasattr(entry.difficulty, "value") else str(entry.difficulty)
        hourly_rate = rate_map.get(difficulty, Decimal("0"))
        entry_cost = minutes * hourly_rate / Decimal("60")
        entry_markup = markup_map.get(difficulty, Decimal("0"))
        entry_price = entry_cost * (Decimal("1") + entry_markup / Decimal("100"))
        total_cost += entry_cost
        total_price += entry_price

    process.internal_cost = total_cost
    process.unit_price = total_price


@router.get("", response_model=List[ProcessResponse])
async def list_processes(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """List all processes"""
    result = await db.execute(
        select(Process)
        .options(selectinload(Process.labor_entries))
        .offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.post("", response_model=ProcessResponse, status_code=201)
async def create_process(
    process: ProcessCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create new process"""
    process_data = process.model_dump(exclude={"labor_entries"})
    db_process = Process(**process_data)

    for i, entry in enumerate(process.labor_entries):
        db_process.labor_entries.append(
            ProcessLaborEntry(minutes=entry.minutes, difficulty=entry.difficulty, sort_order=i)
        )

    db.add(db_process)
    await db.flush()
    await db.refresh(db_process, ["labor_entries"])

    await _compute_time_prices(db, db_process)
    await db.flush()
    await db.refresh(db_process, ["labor_entries"])

    # Explicit commit to ensure data persists before response
    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to commit process creation: {e}")
        raise HTTPException(status_code=500, detail="Błąd zapisu procesu do bazy danych")

    await db.refresh(db_process, ["labor_entries"])
    return db_process


@router.get("/{process_id}", response_model=ProcessResponse)
async def get_process(
    process_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get process by ID"""
    result = await db.execute(
        select(Process)
        .options(selectinload(Process.labor_entries))
        .where(Process.id == process_id)
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
        select(Process)
        .options(selectinload(Process.labor_entries))
        .where(Process.id == process_id)
    )
    process = result.scalar_one_or_none()
    if not process:
        raise HTTPException(status_code=404, detail="Process not found")

    update_data = process_update.model_dump(exclude_unset=True)
    labor_entries_data = update_data.pop("labor_entries", None)

    for key, value in update_data.items():
        setattr(process, key, value)

    if labor_entries_data is not None:
        for old_entry in process.labor_entries:
            await db.delete(old_entry)
        process.labor_entries.clear()
        for i, entry_data in enumerate(labor_entries_data):
            process.labor_entries.append(
                ProcessLaborEntry(minutes=entry_data["minutes"], difficulty=entry_data["difficulty"], sort_order=i)
            )

    await db.flush()
    await db.refresh(process, ["labor_entries"])

    await _compute_time_prices(db, process)
    await db.flush()
    await db.refresh(process, ["labor_entries"])

    # Explicit commit to ensure data persists before response
    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to commit process update: {e}")
        raise HTTPException(status_code=500, detail="Błąd zapisu procesu do bazy danych")

    await db.refresh(process, ["labor_entries"])
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
