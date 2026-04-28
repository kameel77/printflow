from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload
import logging
import traceback

from app.core.database import get_db
from app.models.models import LaborRateSettings, Process, CalculationMethod
from app.schemas.schemas import LaborRateSettingsResponse, LaborRateSettingsUpdate

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/labor-rates", response_model=LaborRateSettingsResponse)
async def get_labor_rates(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LaborRateSettings).where(LaborRateSettings.id == 1))
    settings = result.scalar_one_or_none()
    if not settings:
        return LaborRateSettingsResponse(
            id=1, easy_rate=0, medium_rate=0, hard_rate=0,
            easy_markup=0, medium_markup=0, hard_markup=0,
        )
    return settings


@router.get("/labor-rates/debug")
async def debug_labor_rates(db: AsyncSession = Depends(get_db)):
    """Temporary debug endpoint to check DB state"""
    try:
        # Raw SQL to bypass ORM caching
        result = await db.execute(text("SELECT * FROM labor_rate_settings LIMIT 1"))
        row = result.mappings().first()
        columns = await db.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = 'labor_rate_settings' ORDER BY ordinal_position"
        ))
        cols = [r[0] for r in columns.fetchall()]

        # Check alembic version
        alembic_result = await db.execute(text("SELECT version_num FROM alembic_version"))
        alembic_row = alembic_result.first()

        return {
            "columns": cols,
            "data": dict(row) if row else None,
            "alembic_version": alembic_row[0] if alembic_row else None,
        }
    except Exception as e:
        return {"error": str(e), "traceback": traceback.format_exc()}


@router.put("/labor-rates", response_model=LaborRateSettingsResponse)
async def upsert_labor_rates(
    data: LaborRateSettingsUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(LaborRateSettings).where(LaborRateSettings.id == 1))
    settings = result.scalar_one_or_none()

    if not settings:
        settings = LaborRateSettings(id=1)
        db.add(settings)

    update_dict = data.model_dump(exclude_unset=True)
    logger.info(f"Updating labor rates with: {update_dict}")
    for key, value in update_dict.items():
        setattr(settings, key, value)

    await db.flush()
    await db.refresh(settings)

    # Save the rates first — commit before attempting auto-recalculation
    try:
        await db.commit()
        logger.info("Labor rates committed successfully")
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to commit labor rate settings: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Błąd zapisu stawek: {e}")

    # Auto-recalculate all TIME processes in a SEPARATE transaction
    try:
        from app.api.v1.endpoints.processes import _compute_time_prices

        time_result = await db.execute(
            select(Process)
            .options(selectinload(Process.labor_entries))
            .where(Process.method == CalculationMethod.TIME)
        )
        time_processes = time_result.scalars().all()
        for proc in time_processes:
            await _compute_time_prices(db, proc)
        await db.flush()
        await db.commit()
        logger.info(f"Auto-recalculated {len(time_processes)} TIME processes")
    except Exception as e:
        await db.rollback()
        logger.warning(f"Auto-recalculation of TIME processes failed (rates saved OK): {e}")

    # Re-read to return final state
    await db.refresh(settings)
    return settings
