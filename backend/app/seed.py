# Seed data script — populates the database with initial data matching the old MOCK_DB
# Usage: cd backend && python -m app.seed
import asyncio
from decimal import Decimal

from sqlalchemy import select

from app.core.database import engine, Base, SessionLocal
from app.models.models import (
    Material,
    MaterialVariant,
    Process,
    ProductTemplate,
    TemplateComponent,
    CalculationMethod,
)


async def seed():
    """Populate database with initial data. Idempotent — skips if data already exists."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as session:
        # Check if data already exists
        existing = await session.execute(select(Material))
        if existing.scalars().first():
            print("✓ Database already has data — skipping seed.")
            return

        # ─── Materials ───────────────────────────────────────────
        papier = Material(
            name="Papier Lateksowy",
            category="Papier",
            description="Papier do druku lateksowego, różne szerokości rolek",
        )
        papier.variants.append(MaterialVariant(
            width_cm=Decimal("100"),
            cost_price_per_unit=Decimal("20.00"),
            markup_percentage=Decimal("100.0"),
            margin_w_cm=Decimal("2.0"),
            margin_h_cm=Decimal("0.0"),
            unit="m2",
        ))
        papier.variants.append(MaterialVariant(
            width_cm=Decimal("137"),
            cost_price_per_unit=Decimal("28.00"),
            markup_percentage=Decimal("100.0"),
            margin_w_cm=Decimal("2.0"),
            margin_h_cm=Decimal("0.0"),
            unit="m2",
        ))

        folia = Material(
            name="Folia Magnetyczna",
            category="Folia",
            description="Folia magnetyczna samoprzylepna",
        )
        folia.variants.append(MaterialVariant(
            width_cm=Decimal("140"),
            cost_price_per_unit=Decimal("35.00"),
            markup_percentage=Decimal("80.0"),
            margin_w_cm=Decimal("1.0"),
            margin_h_cm=Decimal("0.0"),
            unit="m2",
        ))

        session.add_all([papier, folia])
        await session.flush()

        # ─── Processes ───────────────────────────────────────────
        ciecie = Process(
            name="Cięcie CNC",
            method=CalculationMethod.LINEAR,
            unit_price=Decimal("5.00"),
            internal_cost=Decimal("2.00"),
            setup_fee=Decimal("10.00"),
            margin_w_cm=Decimal("0.5"),
            margin_h_cm=Decimal("0.5"),
            unit="mb",
        )
        laminowanie = Process(
            name="Laminowanie",
            method=CalculationMethod.AREA,
            unit_price=Decimal("15.00"),
            internal_cost=Decimal("8.00"),
            setup_fee=Decimal("5.00"),
            margin_w_cm=Decimal("0.0"),
            margin_h_cm=Decimal("0.0"),
            unit="m2",
        )

        session.add_all([ciecie, laminowanie])
        await session.flush()

        # ─── Templates ───────────────────────────────────────────
        fototapeta = ProductTemplate(
            name="Fototapeta Lateksowa",
            description="Standardowa fototapeta na papierze lateksowym",
            default_margin_w_cm=Decimal("0.5"),
            default_margin_h_cm=Decimal("0.5"),
            default_overlap_cm=Decimal("1.5"),
        )
        fototapeta.components.append(TemplateComponent(
            material_id=papier.id,
            is_required=True,
            sort_order=0,
        ))
        fototapeta.components.append(TemplateComponent(
            process_id=ciecie.id,
            is_required=True,
            sort_order=1,
        ))

        tablica = ProductTemplate(
            name="Tablica Magnetyczna",
            description="Tablica z folią magnetyczną z opcjonalnym laminowaniem",
            default_margin_w_cm=Decimal("1.0"),
            default_margin_h_cm=Decimal("1.0"),
            default_overlap_cm=Decimal("2.0"),
        )
        tablica.components.append(TemplateComponent(
            material_id=folia.id,
            is_required=True,
            sort_order=0,
        ))
        tablica.components.append(TemplateComponent(
            process_id=laminowanie.id,
            is_required=False,
            sort_order=1,
        ))
        tablica.components.append(TemplateComponent(
            process_id=ciecie.id,
            is_required=True,
            sort_order=2,
        ))

        session.add_all([fototapeta, tablica])
        await session.commit()

        print("✓ Seed data inserted successfully!")
        print(f"  → Materials: {papier.id} ({papier.name}), {folia.id} ({folia.name})")
        print(f"  → Processes:  {ciecie.id} ({ciecie.name}), {laminowanie.id} ({laminowanie.name})")
        print(f"  → Templates: {fototapeta.id} ({fototapeta.name}), {tablica.id} ({tablica.name})")


if __name__ == "__main__":
    asyncio.run(seed())
