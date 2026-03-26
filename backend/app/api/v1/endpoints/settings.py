from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.models import LaborRateSettings
from app.schemas.schemas import LaborRateSettingsResponse, LaborRateSettingsUpdate

router = APIRouter()


@router.get("/labor-rates", response_model=LaborRateSettingsResponse)
async def get_labor_rates(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LaborRateSettings).where(LaborRateSettings.id == 1))
    settings = result.scalar_one_or_none()
    if not settings:
        return LaborRateSettingsResponse(id=1, easy_rate=0, medium_rate=0, hard_rate=0)
    return settings


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

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(settings, key, value)

    await db.flush()
    await db.refresh(settings)
    return settings
