# Calculation endpoint — uses real database
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.models import (
    Material,
    MaterialVariant,
    Process,
    ProductTemplate,
    TemplateComponent,
)
from app.schemas.schemas import CalculationRequest, CalculationResponse
from app.engine.calculator import PrintFlowEngine

router = APIRouter()


async def build_db_context(db: AsyncSession) -> dict:
    """Build the db_context dict that PrintFlowEngine expects, from real DB data."""

    # --- Processes ---
    proc_result = await db.execute(select(Process))
    processes = {p.id: {
        "id": p.id,
        "name": p.name,
        "method": p.method.value,
        "unit_price": float(p.unit_price),
        "internal_cost": float(p.internal_cost) if p.internal_cost else 0.0,
        "setup_fee": float(p.setup_fee) if p.setup_fee else 0.0,
        "margin_w_cm": float(p.margin_w_cm) if p.margin_w_cm else 0.0,
        "margin_h_cm": float(p.margin_h_cm) if p.margin_h_cm else 0.0,
        "unit": p.unit or "szt",
    } for p in proc_result.scalars().all()}

    # --- Materials & Variants ---
    mat_result = await db.execute(
        select(Material).options(selectinload(Material.variants))
    )
    materials_list = mat_result.scalars().all()

    materials = {}
    material_variants = {}
    for m in materials_list:
        materials[m.id] = {"id": m.id, "name": m.name, "category": m.category}
        material_variants[m.id] = [{
            "id": v.id,
            "material_id": v.material_id,
            "width_cm": float(v.width_cm) if v.width_cm else None,
            "cost_price_per_unit": float(v.cost_price_per_unit),
            "markup_percentage": float(v.markup_percentage) if v.markup_percentage else 0.0,
            "margin_w_cm": float(v.margin_w_cm) if v.margin_w_cm else 0.0,
            "unit": v.unit,
        } for v in m.variants if v.is_active]

    # --- Templates ---
    tmpl_result = await db.execute(
        select(ProductTemplate).options(
            selectinload(ProductTemplate.components)
            .selectinload(TemplateComponent.material),
            selectinload(ProductTemplate.components)
            .selectinload(TemplateComponent.process),
        )
    )
    templates = {}
    for t in tmpl_result.scalars().all():
        components = []
        for c in sorted(t.components, key=lambda x: x.sort_order):
            comp_dict: dict = {
                "id": c.id,
                "is_required": c.is_required,
            }
            if c.material_id:
                comp_dict["material_id"] = c.material_id
                comp_dict["name"] = c.material.name if c.material else f"Material {c.material_id}"
            if c.process_id:
                comp_dict["process_id"] = c.process_id
                comp_dict["name"] = c.process.name if c.process else f"Process {c.process_id}"
            if c.group_name:
                comp_dict["group_name"] = c.group_name
            if c.option_label:
                comp_dict["option_label"] = c.option_label
            components.append(comp_dict)

        templates[t.id] = {
            "id": t.id,
            "name": t.name,
            "default_margin_w_cm": float(t.default_margin_w_cm) if t.default_margin_w_cm else 0.0,
            "default_margin_h_cm": float(t.default_margin_h_cm) if t.default_margin_h_cm else 0.0,
            "default_overlap_cm": float(t.default_overlap_cm) if t.default_overlap_cm else 2.0,
            "components": components,
        }

    return {
        "processes": processes,
        "materials": materials,
        "material_variants": material_variants,
        "templates": templates,
    }


@router.post("", response_model=CalculationResponse)
async def calculate_quote(
    request: CalculationRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Calculate quote based on dimensions, template, and selected options.

    Returns both client view (marketing) and tech view (production) data.
    """
    try:
        db_context = await build_db_context(db)
        engine = PrintFlowEngine(db_context)
        result = engine.run(request)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")


@router.get("/templates")
async def list_templates_for_calculator(
    db: AsyncSession = Depends(get_db),
):
    """List available product templates (lightweight, for calculator dropdown)"""
    result = await db.execute(
        select(ProductTemplate)
        .options(selectinload(ProductTemplate.components))
        .where(ProductTemplate.is_active == True)  # noqa: E712
    )
    templates = result.scalars().all()
    return {
        "templates": [
            {
                "id": t.id,
                "name": t.name,
                "description": t.description or f"Szablon z {len(t.components)} komponentami",
            }
            for t in templates
        ]
    }


@router.get("/templates/{template_id}")
async def get_template_for_calculator(
    template_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get template details with components (for calculator)"""
    result = await db.execute(
        select(ProductTemplate)
        .options(
            selectinload(ProductTemplate.components)
            .selectinload(TemplateComponent.material),
            selectinload(ProductTemplate.components)
            .selectinload(TemplateComponent.process),
        )
        .where(ProductTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    components = []
    for c in sorted(template.components, key=lambda x: x.sort_order):
        comp: dict = {
            "id": c.id,
            "is_required": c.is_required,
        }
        if c.material_id:
            comp["material_id"] = c.material_id
            comp["name"] = c.material.name if c.material else f"Material {c.material_id}"
            comp["type"] = "MATERIAL"
        elif c.process_id:
            comp["process_id"] = c.process_id
            comp["name"] = c.process.name if c.process else f"Process {c.process_id}"
            comp["type"] = "PROCESS"
        components.append(comp)

    return {
        "id": template.id,
        "name": template.name,
        "default_margin_w_cm": float(template.default_margin_w_cm) if template.default_margin_w_cm else 0.0,
        "default_margin_h_cm": float(template.default_margin_h_cm) if template.default_margin_h_cm else 0.0,
        "default_overlap_cm": float(template.default_overlap_cm) if template.default_overlap_cm else 2.0,
        "components": components,
    }
