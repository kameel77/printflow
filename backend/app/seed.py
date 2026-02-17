# Seed data script — populates the database with initial data matching the old MOCK_DB
# Usage: cd backend && python -m app.seed
import asyncio
from decimal import Decimal

from sqlalchemy import select

from app.core.database import SessionLocal
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
    # NOTE: Schema creation is handled by Alembic migrations (alembic upgrade head).
    # This function only seeds data.

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
            tooltip_markup_percentage="Narzut procentowy doliczany do ceny zakupowej materiału. 100% oznacza podwojenie ceny.",
            tooltip_margin_w_cm="Dodatkowy margines technologiczny po szerokości — zapas na obcinanie krawędzi.",
            tooltip_margin_h_cm="Dodatkowy margines technologiczny po wysokości.",
        ))
        papier.variants.append(MaterialVariant(
            width_cm=Decimal("137"),
            cost_price_per_unit=Decimal("28.00"),
            markup_percentage=Decimal("100.0"),
            margin_w_cm=Decimal("2.0"),
            margin_h_cm=Decimal("0.0"),
            unit="m2",
            tooltip_markup_percentage="Narzut procentowy doliczany do ceny zakupowej materiału. 100% oznacza podwojenie ceny.",
            tooltip_margin_w_cm="Dodatkowy margines technologiczny po szerokości — zapas na obcinanie krawędzi.",
            tooltip_margin_h_cm="Dodatkowy margines technologiczny po wysokości.",
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
            tooltip_markup_percentage="Narzut procentowy doliczany do ceny zakupowej folii.",
            tooltip_margin_w_cm="Zapas technologiczny na zawinięcie krawędzi folii.",
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
            tooltip_method="LINEAR = obliczanie po obwodzie (mb). AREA = po powierzchni (m²). UNIT = za sztukę.",
            tooltip_unit_price="Cena netto za jednostkę (mb, m², szt.) widoczna dla klienta.",
            tooltip_setup_fee="Jednorazowa opłata za przygotowanie maszyny do cięcia.",
            tooltip_internal_cost="Rzeczywisty koszt wewnętrzny — służy do kalkulacji marży.",
            tooltip_margin_w_cm="Dodatkowy zapas na szer. potrzebny do prawidłowego cięcia.",
            tooltip_margin_h_cm="Dodatkowy zapas na wys. potrzebny do prawidłowego cięcia.",
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
            tooltip_method="AREA = obliczanie po powierzchni (m²). Laminat nakładany jest na całą powierzchnię.",
            tooltip_unit_price="Cena netto za m² laminacji.",
            tooltip_setup_fee="Opłata za przygotowanie laminarki.",
            tooltip_internal_cost="Rzeczywisty koszt folii do laminowania za m².",
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
            tooltip_margin_w_cm="Margines technologiczny po szerokości dodawany do każdego panelu fototapety.",
            tooltip_margin_h_cm="Margines technologiczny po wysokości — zapas na wyrównanie górnej i dolnej krawędzi.",
            tooltip_overlap_cm="Zakładka między sąsiednimi panelami. Zapobiega powstawaniu przerw po naklejeniu.",
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
            tooltip_margin_w_cm="Margines na zakładkę folii magnetycznej po bokach.",
            tooltip_margin_h_cm="Margines na zakładkę folii magnetycznej góra/dół.",
            tooltip_overlap_cm="Zakładka dla tablic wielopanelowych.",
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
